'use client'
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://lukxhexpysqfdpbgnmyq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1a3hoZXhweXNxZmRwYmdubXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTQ3NjIsImV4cCI6MjA2NzU3MDc2Mn0.dzbOSIZtwOVdOrZzg6Nbk_PdccSHg0xyrDlWjZt6u8w';
const supabase = createClient(supabaseUrl, supabaseKey);

const CelebrityMergeQuiz = () => {
  const [currentImage, setCurrentImage] = useState(null);
  const [celebrities, setCelebrities] = useState<any[]>([]);
  const [selectedCelebs, setSelectedCelebs] = useState([]);
  const [correctGuesses, setCorrectGuesses] = useState([]); // Track correct guesses
  const [attempts, setAttempts] = useState(0);
  const [gameState, setGameState] = useState('playing'); // playing, won, lost
  const [score, setScore] = useState(0);
  const [todaysImages, setTodaysImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    loadTodaysQuiz();
  }, []);

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
            merged_images (
              id,
              image_url,
              celebrity1_id,
              celebrity2_id,
              difficulty
            )
          )
        `)
        .eq('quiz_date', today)
        .single();

      if (quizError) throw quizError;

      // Fetch all celebrities for options
      const { data: celebData, error: celebError } = await supabase
        .from('celebrities')
        .select('*')
        .eq('is_active', true);

      if (celebError) throw celebError;

      setCelebrities(celebData || []);
      
      if (quizData && quizData.quiz_images) {
        const images = quizData.quiz_images.map(qi => qi.merged_images);
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

  const handleCelebSelect = (celebId) => {
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

  const getCelebName = (celebId) => {
    const celeb = celebrities.find(c => c.id === celebId);
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
              {/* Difficulty Badge */}
              <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-semibold ${
                currentImage.difficulty === 'easy' ? 'bg-green-500' :
                currentImage.difficulty === 'medium' ? 'bg-yellow-500' :
                'bg-red-500'
              } text-white`}>
                {currentImage.difficulty}
              </div>
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

          {/* Celebrity Options Grid */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {celebrities.map((celeb) => {
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
                    px-2 py-2 rounded-lg text-sm font-medium transition-all transform hover:scale-105
                    ${isCorrectGuess ? 'bg-green-500 text-white scale-105 shadow-lg' :
                      isSelected ? 'bg-purple-600 text-white scale-105 shadow-lg' : 
                      isCorrect ? 'bg-green-500 text-white' :
                      'bg-white/20 text-white hover:bg-white/30'}
                    ${(gameState !== 'playing' || isCorrectGuess) ? 'cursor-not-allowed' : 'cursor-pointer'}
                  `}
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

