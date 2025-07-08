'use client'
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const CelebrityMergeQuiz = () => {
  const [currentImage, setCurrentImage] = useState<any>(null);
  const [displayedCelebs, setDisplayedCelebs] = useState<any[]>([]); // 16 celebrities to display
  const [selectedCelebs, setSelectedCelebs] = useState<number[]>([]);
  const [correctGuesses, setCorrectGuesses] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing'); // playing, won, lost
  const [score, setScore] = useState(0);
  const [todaysImages, setTodaysImages] = useState<any[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    loadTodaysQuiz();
  }, []);

  useEffect(() => {
    if (currentImage) {
      loadCelebrityOptions();
    }
  }, [currentImage]);

  const loadTodaysQuiz = async () => {
    try {
      setLoading(true);
      
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];
      
      // Fetch today's quiz images
      const { data: quizData, error: quizError } = await supabase
        .from('daily_quizzes')
        .select(`
          *,
          quiz_images (
            *,
            image:merged_images (
              id,
              image_url,
              celebrity1_id,
              celebrity2_id,
              merge_type
            )
          )
        `)
        .eq('quiz_date', today)
        .single();

      if (quizError) throw quizError;
      
      if (quizData && quizData.quiz_images) {
        const images = quizData.quiz_images.map((qi: any) => qi.image);
        setTodaysImages(images);
        if (images.length > 0) {
          setCurrentImage(images[0]);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading quiz:', error);
      setLoading(false);
    }
  };

  const loadCelebrityOptions = async () => {
    if (!currentImage) return;

    try {
      // Get the correct celebrities' genders
      const { data: correctCelebs } = await supabase
        .from('celebrities')
        .select('id, name, gender')
        .in('id', [currentImage.celebrity1_id, currentImage.celebrity2_id]);

      // Determine which genders to fetch based on merge_type
      let genderFilter = [];
      if (currentImage.merge_type === 'MAN,MAN') {
        genderFilter = ['male'];
      } else if (currentImage.merge_type === 'WOMAN,WOMAN') {
        genderFilter = ['female'];
      } else {
        genderFilter = ['male', 'female'];
      }

      // Fetch celebrities of appropriate gender(s)
      const { data: availableCelebs } = await supabase
        .from('celebrities')
        .select('*')
        .in('gender', genderFilter)
        .eq('is_active', true);

      if (availableCelebs && correctCelebs) {
        // Ensure correct answers are included
        const correctIds = [currentImage.celebrity1_id, currentImage.celebrity2_id];
        const otherCelebs = availableCelebs.filter(c => !correctIds.includes(c.id));

        // Randomly select 14 other celebrities
        const shuffled = otherCelebs.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 14);

        // Combine with correct answers and shuffle
        const allOptions = [...correctCelebs, ...selected].sort(() => Math.random() - 0.5);

        setDisplayedCelebs(allOptions.slice(0, 16)); // Ensure exactly 16
      }
    } catch (error) {
      console.error('Error loading celebrity options:', error);
    }
  };

  const handleCelebSelect = (celebId: number) => {
    if (gameState !== 'playing' || correctGuesses.includes(celebId)) return;
    
    if (selectedCelebs.includes(celebId)) {
      setSelectedCelebs(selectedCelebs.filter(id => id !== celebId));
    } else if (selectedCelebs.length + correctGuesses.length < 2) {
      setSelectedCelebs([...selectedCelebs, celebId]);
    }
  };

  const handleSubmit = () => {
    if (selectedCelebs.length === 0 || gameState !== 'playing') return;

    const correct1 = currentImage.celebrity1_id;
    const correct2 = currentImage.celebrity2_id;
    
    // Check which selected celebrities are correct
    const newCorrectGuesses = [...correctGuesses];
    const remainingSelected = [];
    
    selectedCelebs.forEach(celebId => {
      if (celebId === correct1 || celebId === correct2) {
        if (!newCorrectGuesses.includes(celebId)) {
          newCorrectGuesses.push(celebId);
        }
      } else {
        remainingSelected.push(celebId);
      }
    });

    setCorrectGuesses(newCorrectGuesses);
    
    // Check if both celebrities are now guessed correctly
    const hasGuessedBoth = 
      (newCorrectGuesses.includes(correct1) && newCorrectGuesses.includes(correct2));

    if (hasGuessedBoth) {
      setGameState('won');
      setScore(score + (3 - attempts) * 10);
      setFeedback('Correct! Well done!');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setGameState('lost');
        setFeedback('Game Over! The correct answer was shown.');
      } else {
        if (newCorrectGuesses.length > correctGuesses.length) {
          setFeedback(`Good! You got one correct. ${3 - newAttempts} attempts remaining.`);
        } else {
          setFeedback(`Wrong! ${3 - newAttempts} attempts remaining.`);
        }
        setSelectedCelebs([]);
      }
    }
  };

  const nextImage = () => {
    if (currentImageIndex < todaysImages.length - 1) {
      const nextIndex = currentImageIndex + 1;
      setCurrentImageIndex(nextIndex);
      setCurrentImage(todaysImages[nextIndex]);
      setSelectedCelebs([]);
      setCorrectGuesses([]);
      setAttempts(0);
      setGameState('playing');
      setFeedback('');
    } else {
      setFeedback('You\'ve completed today\'s quiz!');
    }
  };

  const getCelebName = (celebId: number) => {
    const celeb = displayedCelebs.find(c => c.id === celebId);
    return celeb ? celeb.name : '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-white text-xl">Loading today's quiz...</div>
      </div>
    );
  }

  if (!currentImage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-white text-xl">No quiz available for today!</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-sm mx-auto">
        {/* Score Header */}
        <div className="text-center mb-4 pt-4">
          <div className="flex justify-between items-center text-white">
            <div>
              <span className="text-xs text-purple-200">Score</span>
              <p className="text-xl font-bold">{score}</p>
            </div>
            <div>
              <span className="text-xs text-purple-200">Image</span>
              <p className="text-xl font-bold">{currentImageIndex + 1}/{todaysImages.length}</p>
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 shadow-2xl">
          {/* Merged Image */}
          <div className="mb-4">
            <div className="relative">
              <img 
                src={currentImage.image_url} 
                alt="Merged Celebrity"
                className="w-full aspect-square object-cover rounded-xl shadow-lg"
              />
            </div>
          </div>

          {/* Attempts Indicator */}
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3].map((num) => (
              <div 
                key={num}
                className={`w-2.5 h-2.5 rounded-full ${
                  num <= attempts ? 'bg-red-500' : 'bg-green-500'
                }`}
              />
            ))}
          </div>

          {/* Celebrity Options Grid - 4x4 */}
          <div className="grid grid-cols-4 gap-1.5 mb-4">
            {displayedCelebs.map((celeb) => {
              const isSelected = selectedCelebs.includes(celeb.id);
              const isCorrectGuess = correctGuesses.includes(celeb.id);
              const isCorrect = gameState !== 'playing' && 
                (celeb.id === currentImage.celebrity1_id || celeb.id === currentImage.celebrity2_id);
              
              return (
                <button
                  key={celeb.id}
                  onClick={() => handleCelebSelect(celeb.id)}
                  disabled={gameState !== 'playing' || isCorrectGuess}
                  className={`
                    px-1 py-2 rounded text-xs font-medium transition-all transform hover:scale-105
                    ${isCorrectGuess ? 'bg-green-500 text-white scale-105 shadow-lg' :
                      isSelected ? 'bg-purple-600 text-white scale-105 shadow-lg' : 
                      isCorrect ? 'bg-green-500 text-white' :
                      'bg-white/20 text-white hover:bg-white/30'}
                    ${(gameState !== 'playing' || isCorrectGuess) ? 'cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  style={{ fontSize: '10px' }}
                >
                  {celeb.name}
                </button>
              );
            })}
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className={`text-center mb-3 text-sm font-semibold ${
              gameState === 'won' ? 'text-green-400' : 
              gameState === 'lost' ? 'text-red-400' : 
              'text-yellow-400'
            }`}>
              {feedback}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-3">
            {gameState === 'playing' ? (
              <button
                onClick={handleSubmit}
                disabled={selectedCelebs.length === 0}
                className={`
                  px-6 py-2.5 rounded-full text-sm font-semibold transition-all
                  ${selectedCelebs.length > 0
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 shadow-lg' 
                    : 'bg-gray-500 text-gray-300 cursor-not-allowed'}
                `}
              >
                Submit Guess
              </button>
            ) : (
              <>
                {currentImageIndex < todaysImages.length - 1 && (
                  <button
                    onClick={nextImage}
                    className="px-6 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transform hover:scale-105 shadow-lg transition-all"
                  >
                    Next Image
                  </button>
                )}
              </>
            )}
          </div>

          {/* Show correct answer when game is over */}
          {gameState === 'lost' && (
            <div className="mt-4 text-center text-white">
              <p className="text-sm">The correct answer was:</p>
              <p className="text-base font-bold text-green-400">
                {getCelebName(currentImage.celebrity1_id)} & {getCelebName(currentImage.celebrity2_id)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CelebrityMergeQuiz;

