import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://lukxhexpysqfdpbgnmyq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1a3hoZXhweXNxZmRwYmdubXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5OTQ3NjIsImV4cCI6MjA2NzU3MDc2Mn0.dzbOSIZtwOVdOrZzg6Nbk_PdccSHg0xyrDlWjZt6u8w';
const supabase = createClient(supabaseUrl, supabaseKey);

const CelebrityMergeQuiz = () => {
  const [currentImage, setCurrentImage] = useState(null);
  const [celebrities, setCelebrities] = useState([]);
  const [selectedCelebs, setSelectedCelebs] = useState([]);
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
    if (gameState !== 'playing') return;
    
    if (selectedCelebs.includes(celebId)) {
      setSelectedCelebs(selectedCelebs.filter(id => id !== celebId));
    } else if (selectedCelebs.length < 2) {
      setSelectedCelebs([...selectedCelebs, celebId]);
    }
  };

  const handleSubmit = () => {
    if (selectedCelebs.length !== 2 || gameState !== 'playing') return;

    const correct1 = currentImage.celebrity1_id;
    const correct2 = currentImage.celebrity2_id;
    
    const isCorrect = 
      (selectedCelebs.includes(correct1) && selectedCelebs.includes(correct2));

    if (isCorrect) {
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
        setFeedback(`Wrong! ${3 - newAttempts} attempts remaining.`);
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">Loading today's quiz...</div>
      </div>
    );
  }

  if (!currentImage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-2xl">No quiz available for today!</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold text-white mb-2">Celebrity Merge Quiz</h1>
          <p className="text-purple-200">Can you guess which two celebrities are merged?</p>
          <div className="mt-4 flex justify-center gap-8">
            <div className="text-white">
              <span className="text-sm text-purple-200">Score</span>
              <p className="text-2xl font-bold">{score}</p>
            </div>
            <div className="text-white">
              <span className="text-sm text-purple-200">Image</span>
              <p className="text-2xl font-bold">{currentImageIndex + 1}/{todaysImages.length}</p>
            </div>
          </div>
        </div>

        {/* Main Game Area */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl">
          {/* Merged Image */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <img 
                src={currentImage.image_url} 
                alt="Merged Celebrity"
                className="w-80 h-80 object-cover rounded-2xl shadow-lg"
              />
              {/* Difficulty Badge */}
              <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-semibold ${
                currentImage.difficulty === 'easy' ? 'bg-green-500' :
                currentImage.difficulty === 'medium' ? 'bg-yellow-500' :
                'bg-red-500'
              } text-white`}>
                {currentImage.difficulty}
              </div>
            </div>
          </div>

          {/* Attempts Indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3].map((num) => (
              <div 
                key={num}
                className={`w-3 h-3 rounded-full ${
                  num <= attempts ? 'bg-red-500' : 'bg-green-500'
                }`}
              />
            ))}
          </div>

          {/* Celebrity Options Grid */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            {celebrities.map((celeb) => {
              const isSelected = selectedCelebs.includes(celeb.id);
              const isCorrect = gameState !== 'playing' && 
                (celeb.id === currentImage.celebrity1_id || celeb.id === currentImage.celebrity2_id);
              
              return (
                <button
                  key={celeb.id}
                  onClick={() => handleCelebSelect(celeb.id)}
                  disabled={gameState !== 'playing'}
                  className={`
                    px-4 py-3 rounded-lg font-medium transition-all transform hover:scale-105
                    ${isSelected ? 'bg-purple-600 text-white scale-105 shadow-lg' : 
                      isCorrect ? 'bg-green-500 text-white' :
                      'bg-white/20 text-white hover:bg-white/30'}
                    ${gameState !== 'playing' ? 'cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {celeb.name}
                </button>
              );
            })}
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className={`text-center mb-4 text-lg font-semibold ${
              gameState === 'won' ? 'text-green-400' : 
              gameState === 'lost' ? 'text-red-400' : 
              'text-yellow-400'
            }`}>
              {feedback}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            {gameState === 'playing' ? (
              <button
                onClick={handleSubmit}
                disabled={selectedCelebs.length !== 2}
                className={`
                  px-8 py-3 rounded-full font-semibold transition-all
                  ${selectedCelebs.length === 2 
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
                    className="px-8 py-3 rounded-full font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transform hover:scale-105 shadow-lg transition-all"
                  >
                    Next Image
                  </button>
                )}
              </>
            )}
          </div>

          {/* Show correct answer when game is over */}
          {gameState === 'lost' && (
            <div className="mt-6 text-center text-white">
              <p className="text-lg">The correct answer was:</p>
              <p className="text-xl font-bold text-green-400">
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
