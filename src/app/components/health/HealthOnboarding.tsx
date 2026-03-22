import React, { useState } from 'react';

interface HealthOnboardingProps {
  onComplete: (restTime: number) => void;
}

export function HealthOnboarding({ onComplete }: HealthOnboardingProps) {
  const [selectedTime, setSelectedTime] = useState(90);

  const times = [
    { seconds: 60, label: '1분' },
    { seconds: 90, label: '1분 30초' },
    { seconds: 120, label: '2분' },
    { seconds: 180, label: '3분' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ backgroundColor: 'var(--planner-bg)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black mb-2">WORKOUT</h1>
          <p className="text-gray-600">기본 휴식 시간을 설정해주세요</p>
        </div>

        <div className="bg-white rounded-2xl p-6 mb-6">
          <div className="space-y-3">
            {times.map(time => (
              <button
                key={time.seconds}
                onClick={() => setSelectedTime(time.seconds)}
                className={`w-full py-4 rounded-xl font-semibold transition-all ${
                  selectedTime === time.seconds
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {time.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onComplete(selectedTime)}
          className="w-full py-4 bg-black text-white rounded-2xl font-bold text-lg shadow-lg"
        >
          시작하기
        </button>
      </div>
    </div>
  );
}
