import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { AXIOM_INTRO_SCRIPT } from '../../content/avatarIntroScript';

interface AvatarIntroPanelProps {
  onComplete: () => void;
  onSkip?: () => void;
  isReplay?: boolean;
}

export const AvatarIntroPanel: React.FC<AvatarIntroPanelProps> = ({
  onComplete,
  onSkip,
  isReplay = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handleComplete = () => {
    setIsPlaying(false);
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 mb-4">
          <span className="text-4xl">A</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {AXIOM_INTRO_SCRIPT.title}
        </h1>
        <p className="text-gray-600">
          Watch this brief introduction to understand how Axiom works
        </p>
      </div>

      <Card className="bg-gray-900 text-white overflow-hidden">
        <CardContent className="p-0">
          <div className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-yellow-500 bg-opacity-20 flex items-center justify-center">
                <div className="w-24 h-24 rounded-full bg-yellow-500 bg-opacity-30 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-yellow-500 flex items-center justify-center text-black font-bold text-2xl">
                    A
                  </div>
                </div>
              </div>
            </div>
            
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-black bg-opacity-70 rounded-lg p-4">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {AXIOM_INTRO_SCRIPT.sectionMarkers[currentSection]?.text || 
                   "Click play to begin the introduction"}
                </p>
              </div>
            </div>

            <div className="absolute top-4 right-4 text-xs text-gray-400">
              {AXIOM_INTRO_SCRIPT.estimatedDurationSeconds}s
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Introduction Script</h3>
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
          {AXIOM_INTRO_SCRIPT.scriptText}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3">
        {onSkip && !isReplay && (
          <Button
            variant="outline"
            onClick={onSkip}
            className="w-full sm:w-auto"
          >
            Skip Introduction
          </Button>
        )}
        
        <div className="flex gap-2 ml-auto">
          {isReplay && (
            <Button
              variant="outline"
              onClick={onComplete}
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          )}
          
          <Button
            onClick={handleComplete}
            className="bg-yellow-500 hover:bg-yellow-600 text-black w-full sm:w-auto"
          >
            {isReplay ? "Watch Again" : "Continue to Onboarding"}
          </Button>
        </div>
      </div>

      <div className="text-center text-xs text-gray-500">
        Duration: approximately {Math.ceil(AXIOM_INTRO_SCRIPT.estimatedDurationSeconds / 60)} minute
        {AXIOM_INTRO_SCRIPT.estimatedDurationSeconds > 60 ? 's' : ''} |
        {' '}{AXIOM_INTRO_SCRIPT.wordCount} words
      </div>
    </div>
  );
};

export default AvatarIntroPanel;
