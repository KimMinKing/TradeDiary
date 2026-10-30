// [컴포넌트] AI challenge - Trade Entry 전 이성적 판단 유도
// [호출] TradePage.jsx, JournalPage.jsx

import React, { useState, useEffect } from 'react';
import api from '../api/journalApi';
import { useLocale } from '../i18n/localeContext';

const AIChallenge = ({ symbol, currentPrice, onComplete, onCancel }) => {
    const { language } = useLocale();
    const [currentStep, setCurrentStep] = useState(0);
    const [responses, setResponses] = useState({});
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(false);

    const questions = [
        {
            id: 1,
            question: language === 'ko' ? "이 자산에 진입하려는 구체적인 기술적 가설을 한 문장으로 설명하세요." : "Explain your technical thesis for entering this asset in one sentence.",
            placeholder: language === 'ko' ? "예: BTC가 지지선을 돌파할 것으로 예상됩니다" : "e.g. I expect BTC to break above support.",
            type: "text"
        },
        {
            id: 2,
            question: language === 'ko' ? "현재 변동성을 고려한 목표가와 손절가를 입력하세요." : "Enter your target and stop prices for the current volatility.",
            placeholder: language === 'ko' ? "목표가: 55,000 KRW, 손절가: 48,000 KRW" : "Target: 55,000 KRW, Stop: 48,000 KRW",
            type: "price"
        },
        {
            id: 3,
            question: language === 'ko' ? "과거 유사한 상황에서 같은 근거로 거래했을 때 손실률은 68%였습니다. 그래도 진입하시겠습니까?" : "Similar setups produced a 68% loss rate in the past. Do you still want to enter?",
            type: "confirmation"
        }
    ];

    useEffect(() => {
        let active = true;
        const start = async () => {
            setLoading(true);
            try {
                const response = await api.startAichallenge({
                    user_id: localStorage.getItem('userId'),
                    symbol,
                    current_price: currentPrice
                });
                if (active) setSession(response);
            } catch (error) {
                console.error('AI 챌린지 시작 failed:', error);
            } finally {
                if (active) setLoading(false);
            }
        };
        void start();
        return () => { active = false; };
    }, [currentPrice, symbol]);

    const handleResponse = async (response) => {
        const newResponses = { ...responses, [currentStep]: response };
        setResponses(newResponses);

        try {
            if (currentStep < questions.length - 1) {
                // 다음 Question으로 이동
                setCurrentStep(currentStep + 1);
            } else {
                // 챌린지 complete
                await completeChallenge(newResponses);
            }
        } catch (error) {
            console.error('응답 처리 failed:', error);
        }
    };

    const completeChallenge = async (responses) => {
        try {
            setLoading(true);
            await api.completeAichallenge(session.session_id, responses);

            // complete 시 콜백 호출
            if (onComplete) {
                onComplete(responses);
            }

            setLoading(false);
        } catch (error) {
            console.error('챌린지 complete failed:', error);
            setLoading(false);
        }
    };

    const renderQuestion = () => {
        const question = questions[currentStep];

        switch (question.type) {
            case 'text':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">{question.question}</h3>
                        <textarea
                            className="w-full p-3 border border-gray-300 rounded-lg"
                            rows={3}
                            placeholder={question.placeholder}
                            value={responses[currentStep] || ''}
                            onChange={(e) => handleResponse(e.target.value)}
                        />
                    </div>
                );

            case 'price':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">{question.question}</h3>
                        <div className="space-y-2">
                            <input
                                type="text"
                                className="w-full p-3 border border-gray-300 rounded-lg"
                                placeholder="Target price: 55,000 KRW"
                                value={responses[currentStep]?.target_price || ''}
                                onChange={(e) => {
                                    const response = responses[currentStep] || {};
                                    handleResponse({
                                        ...response,
                                        target_price: e.target.value
                                    });
                                }}
                            />
                            <input
                                type="text"
                                className="w-full p-3 border border-gray-300 rounded-lg"
                                placeholder="Stop price: 48,000 KRW"
                                value={responses[currentStep]?.stop_loss || ''}
                                onChange={(e) => {
                                    const response = responses[currentStep] || {};
                                    handleResponse({
                                        ...response,
                                        stop_loss: e.target.value
                                    });
                                }}
                            />
                        </div>
                        {responses[currentStep] && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-gray-600">
                                    {language === 'ko' ? '손익비' : 'Risk/reward'}: {calculateRiskReward(
                                        responses[currentStep].target_price,
                                        responses[currentStep].stop_loss,
                                        currentPrice
                                    ).toFixed(2)}
                                </p>
                            </div>
                        )}
                    </div>
                );

            case 'confirmation':
                return (
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">{question.question}</h3>
                        <div className="flex space-x-4">
                            <button
                                className="flex-1 p-3 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                onClick={() => handleResponse('yes')}
                            >
                                Yes, enter trade
                            </button>
                            <button
                                className="flex-1 p-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
                                onClick={() => handleResponse('no')}
                            >
                                No, skip trade
                            </button>
                        </div>
                    </div>
                );
        }
    };

    const calculateRiskReward = (targetPrice, stopLoss, entryPrice) => {
        try {
            const target = parseFloat(targetPrice.replace(/[^0-9.-]+/g, ''));
            const stop = parseFloat(stopLoss.replace(/[^0-9.-]+/g, ''));

            if (!target || !stop || !entryPrice) return 0;

            const risk = Math.abs(entryPrice - stop);
            const reward = Math.abs(target - entryPrice);

            return risk > 0 ? reward / risk : 0;
        } catch {
            return 0;
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-6 rounded-lg">
                    <p>{language === 'ko' ? 'AI 챌린지를 준비 중...' : 'Preparing the AI challenge...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">AI challenge</h2>
                    <button
                        onClick={onCancel}
                        className="text-gray-500 hover:text-gray-700"
                    >
                        ✕
                    </button>
                </div>

                <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>{language === 'ko' ? '질문' : 'Question'} {currentStep + 1}/{questions.length}</span>
                        <span>{symbol} - {currentPrice.toLocaleString()} KRW</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${((currentStep + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                <div className="mb-6">
                    {renderQuestion()}
                </div>

                {currentStep > 0 && (
                    <button
                        className="w-full p-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 mb-4"
                        onClick={() => setCurrentStep(currentStep - 1)}
                    >
                        Previous
                    </button>
                )}
            </div>
        </div>
    );
};

export default AIChallenge;
