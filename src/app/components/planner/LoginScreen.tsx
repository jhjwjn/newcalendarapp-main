import React from 'react';
import { usePlanner } from '../../context/PlannerContext';
import { Calendar } from 'lucide-react';

interface LoginScreenProps {
  onLocalMode: () => void;
}

export function LoginScreen({ onLocalMode }: LoginScreenProps) {
  const { signInWithGoogle } = usePlanner();

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
            <Calendar className="w-10 h-10 text-white" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          PLANNER × HEALTH
        </h1>
        <p className="text-gray-600 mb-8">
          일정 관리부터 건강 관리까지, 하나로 통합된 라이프 플래너
        </p>

        <button
          onClick={signInWithGoogle}
          className="w-full bg-white border-2 border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-3 mb-4"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google로 로그인
        </button>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-500">또는</span>
          </div>
        </div>

        <button
          onClick={onLocalMode}
          className="w-full bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors"
        >
          로컬 모드로 계속하기
        </button>

        <p className="mt-6 text-xs text-gray-500">
          로컬 모드는 클라우드 동기화 없이 브라우저에만 데이터가 저장됩니다.
          <br />
          Google 로그인 시 클라우드 동기화와 모든 기능을 사용할 수 있습니다.
        </p>
      </div>
    </div>
  );
}