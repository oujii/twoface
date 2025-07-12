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

interface RoundStats {
  imageIndex: number;
  attempts: number;
  points: number;
  completed: boolean;
  won: boolean;
}

const CelebrityMergeQuiz = () => {
  const [currentImage, setCurrentImage] = useState<any>(null);
  const [displayedCelebs, setDisplayedCelebs] = useState<any[]>([]); // 12 celebrities to display (3x4 grid)
  const [selectedCelebs, setSelectedCelebs] = useState<number[]>([]);
  const [correctGuesses, setCorrectGuesses] = useState<number[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost' | 'quiz_complete'>('playing'); // playing, won, lost, quiz_complete
  const [score, setScore] = useState(0);
  const [todaysImages, setTodaysImages] = useState<any[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [roundStats, setRoundStats] = useState<RoundStats[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [dailyQuizCompleted, setDailyQuizCompleted] = useState(false);

  useEffect(() => {
    const initializeQuiz = async () => {
      checkDailyQuizStatus();
      // Only load quiz if not already completed
      const today = new Date().toISOString().split('T')[0];
      const completedDate = localStorage.getItem('quiz_completed_date');
      const completed = localStorage.getItem('quiz_completed') === 'true';

      if (!(completedDate === today && completed)) {
        await loadTodaysQuiz();
      } else {
        setLoading(false);
      }
    };

    initializeQuiz();
  }, []);

  const checkDailyQuizStatus = () => {
    const today = new Date().toISOString().split('T')[0];
    const completedDate = localStorage.getItem('quiz_completed_date');
    const completed = localStorage.getItem('quiz_completed') === 'true';

    if (completedDate === today && completed) {
      setDailyQuizCompleted(true);
      // Load saved stats if available
      const savedStats = localStorage.getItem('quiz_stats');
      const savedScore = localStorage.getItem('quiz_score');
      if (savedStats && savedScore) {
        setRoundStats(JSON.parse(savedStats));
        setScore(parseInt(savedScore));
        setGameState('quiz_complete');
        setQuizCompleted(true);
      }
    }
  };

  const markQuizCompleted = (finalStats?: RoundStats[], finalScore?: number) => {
    const today = new Date().toISOString().split('T')[0];
    const statsToSave = finalStats || roundStats;
    const scoreToSave = finalScore || score;

    localStorage.setItem('quiz_completed_date', today);
    localStorage.setItem('quiz_completed', 'true');
    localStorage.setItem('quiz_stats', JSON.stringify(statsToSave));
    localStorage.setItem('quiz_score', scoreToSave.toString());
    setDailyQuizCompleted(true);

    console.log('Quiz marked as completed for:', today);
    console.log('Stats saved:', statsToSave);
    console.log('Score saved:', scoreToSave);
  };

  // Testing function to clear daily completion (for development/testing)
  const clearDailyCompletion = () => {
    localStorage.removeItem('quiz_completed_date');
    localStorage.removeItem('quiz_completed');
    localStorage.removeItem('quiz_stats');
    localStorage.removeItem('quiz_score');
    setDailyQuizCompleted(false);
    console.log('Daily completion cleared');
  };

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

        // Randomly select 10 other celebrities
        const shuffled = otherCelebs.sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, 10);

        // Combine with correct answers and shuffle
        const allOptions = [...correctCelebs, ...selected].sort(() => Math.random() - 0.5);

        setDisplayedCelebs(allOptions.slice(0, 12)); // Ensure exactly 12
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
      const pointsEarned = (3 - attempts) * 10;
      const newScore = score + pointsEarned;
      setGameState('won');
      setScore(newScore);
      setFeedback('Correct! Well done!');

      // Record round stats
      const newRoundStat: RoundStats = {
        imageIndex: currentImageIndex,
        attempts: attempts + 1,
        points: pointsEarned,
        completed: true,
        won: true
      };
      setRoundStats(prev => [...prev, newRoundStat]);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 3) {
        setGameState('lost');
        setFeedback('Game Over! The correct answer was shown.');

        // Record round stats for failed round
        const newRoundStat: RoundStats = {
          imageIndex: currentImageIndex,
          attempts: newAttempts,
          points: 0,
          completed: true,
          won: false
        };
        setRoundStats(prev => [...prev, newRoundStat]);
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
      // Quiz completed - show statistics
      setGameState('quiz_complete');
      setQuizCompleted(true);
      setFeedback('You\'ve completed today\'s quiz!');
      // Pass current stats and score to ensure they're saved
      markQuizCompleted(roundStats, score);
    }
  };

  const getCelebName = (celebId: number) => {
    const celeb = displayedCelebs.find(c => c.id === celebId);
    return celeb ? celeb.name : '';
  };

  const handleShare = async () => {
    const shareText = `I scored ${score} points, try playing yourself!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'TwoFace Celebrity Quiz',
          text: shareText,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(`${shareText} ${window.location.href}`);
          alert('Score copied to clipboard!');
        } catch (error) {
          console.log('Error copying to clipboard:', error);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-2">
        <div className="text-white text-xl">Loading today's quiz...</div>
      </div>
    );
  }

  // Show message if daily quiz is already completed but not in quiz_complete state
  if (dailyQuizCompleted && gameState !== 'quiz_complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-2">
        <div className="max-w-sm mx-auto text-center">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 shadow-2xl">
            <h1 className="text-2xl font-bold text-white mb-3">Quiz Already Completed!</h1>
            <p className="text-purple-200 mb-4">You've already completed today's quiz. Come back tomorrow for a new challenge!</p>
            <button
              onClick={() => {
                // Show the completed quiz stats
                setGameState('quiz_complete');
              }}
              className="w-full px-5 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 shadow-lg transition-all"
            >
              View Your Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentImage && !dailyQuizCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-white text-xl">No quiz available for today!</div>
      </div>
    );
  }

  // Show statistics screen when quiz is completed
  if (gameState === 'quiz_complete') {
    const totalRounds = roundStats.length;
    const wonRounds = roundStats.filter(r => r.won).length;
    const averageAttempts = totalRounds > 0 ? (roundStats.reduce((sum, r) => sum + r.attempts, 0) / totalRounds).toFixed(1) : '0';

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-2">
        <div className="max-w-sm mx-auto">
          {/* Header */}
          <div className="text-center mb-3 pt-2">
            <h1
              className="text-2xl font-bold text-white mb-2 cursor-pointer"
              onDoubleClick={clearDailyCompletion}
              title="Double-click to reset daily completion (for testing)"
            >
              Quiz Complete!
            </h1>
            <div className="text-4xl font-bold text-yellow-400 mb-3">{score} Points</div>
          </div>

          {/* Overall Stats */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 mb-3 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-3">Overall Performance</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-400">{wonRounds}</div>
                <div className="text-xs text-purple-200">Won</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-400">{totalRounds - wonRounds}</div>
                <div className="text-xs text-purple-200">Lost</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-400">{averageAttempts}</div>
                <div className="text-xs text-purple-200">Avg Attempts</div>
              </div>
            </div>
          </div>

          {/* Round by Round Stats */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 mb-3 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-2">Round Details</h2>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {roundStats.map((round, index) => (
                <div key={index} className="flex justify-between items-center bg-white/5 rounded-lg p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">Round {round.imageIndex + 1}</span>
                    <span className={`text-xs px-2 py-1 rounded ${round.won ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                      {round.won ? 'Won' : 'Lost'}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-bold">{round.points} pts</div>
                    <div className="text-xs text-purple-200">{round.attempts} attempts</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={handleShare}
              className="w-full px-5 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transform hover:scale-105 shadow-lg transition-all"
            >
              Share Your Score
            </button>
            <button
              onClick={() => {
                // Clear today's completion for testing (remove in production)
                // localStorage.removeItem('quiz_completed_date');
                // localStorage.removeItem('quiz_completed');
                // localStorage.removeItem('quiz_stats');
                // localStorage.removeItem('quiz_score');
                window.location.reload();
              }}
              className="w-full px-5 py-2.5 rounded-full text-sm font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 shadow-lg transition-all"
            >
              Play Again Tomorrow
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-1">
      <div className="max-w-sm mx-auto">
        {/* Score Header */}
        <div className="text-center mb-2 pt-2">
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
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 shadow-2xl">
          {/* Merged Image */}
          <div className="mb-3">
            <div className="relative">
              <img
                src={currentImage.image_url}
                alt="Merged Celebrity"
                className="w-full aspect-square object-cover rounded-xl shadow-lg"
              />
            </div>
          </div>

          {/* Attempts Indicator */}
          <div className="flex justify-center gap-2 mb-3">
            {[1, 2, 3].map((num) => (
              <div
                key={num}
                className={`w-3 h-3 rounded-full ${
                  num <= attempts ? 'bg-red-500' : 'bg-green-500'
                }`}
              />
            ))}
          </div>

          {/* Celebrity Options Grid - 3x4 */}
          <div className="grid grid-cols-3 gap-2 mb-3">
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
                    px-2 py-3 rounded-lg text-sm font-medium transition-all transform hover:scale-105
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
            <div className={`text-center mb-2 text-sm font-semibold ${
              gameState === 'won' ? 'text-green-400' :
              gameState === 'lost' ? 'text-red-400' :
              'text-yellow-400'
            }`}>
              {feedback}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-2">
            {gameState === 'playing' ? (
              <button
                onClick={handleSubmit}
                disabled={selectedCelebs.length === 0}
                className={`
                  px-5 py-2 rounded-full text-sm font-semibold transition-all
                  ${selectedCelebs.length > 0
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 shadow-lg'
                    : 'bg-gray-500 text-gray-300 cursor-not-allowed'}
                `}
              >
                Submit Guess
              </button>
            ) : (
              <>
                {currentImageIndex < todaysImages.length - 1 ? (
                  <button
                    onClick={nextImage}
                    className="px-5 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transform hover:scale-105 shadow-lg transition-all"
                  >
                    Next Image
                  </button>
                ) : (
                  <button
                    onClick={nextImage}
                    className="px-5 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transform hover:scale-105 shadow-lg transition-all"
                  >
                    View Results
                  </button>
                )}
              </>
            )}
          </div>

          {/* Show correct answer when game is over */}
          {gameState === 'lost' && (
            <div className="mt-3 text-center text-white">
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

