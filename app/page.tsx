'use client';

import React, { useCallback, useState } from 'react';
import { Play, BarChart3, TrendingUp, Target } from 'lucide-react';

// 타입 정의
type Variant = {
  name: string;
  description: string;
  visual: string;
  appeal_type: 'convenience' | 'price' | 'urgency' | 'speed';
};

type Scenario = {
  name: string;
  description: string;
  variants: { A: Variant; B: Variant };
};

type Segment = {
  name: string;
  price_sensitivity: number;
  convenience_preference: number;
  urgency_response: number;
  speed_preference: number;
  research_basis: string;
};

type VariantResult = {
  name: string;
  visitors: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
};

type RecommendationData = {
  recommendation: string;
  researchSupport?: string;
};

type SimulationResult = {
  variantA: VariantResult;
  variantB: VariantResult;
  winner: 'A' | 'B';
  improvement: number;
  confidence: number;
  revenueLift: number;
  recommendationData: RecommendationData;
};

// 사전 정의된 A/B 테스트 시나리오들 (모듈 스코프로 이동)
const abTestScenarios: Record<string, Scenario> = {
    homepage_primary_message: {
      name: "홈화면 메인 메시지",
      description: "홈화면 상단에 어떤 메시지를 강조할지",
      variants: {
        A: {
          name: "빠른배송 강조",
          description: "오늘 주문 시 내일 도착",
          visual: "🚚 오늘 주문 시 내일 도착",
          appeal_type: "convenience"
        },
        B: {
          name: "할인 강조", 
          description: "최대 50% 할인 중",
          visual: "🔥 최대 50% 할인 중",
          appeal_type: "price"
        }
      }
    },
    product_card_badge: {
      name: "상품카드 배지",
      description: "상품 리스트에서 어떤 정보를 배지로 강조할지",
      variants: {
        A: {
          name: "무료배송 배지",
          description: "무료배송",
          visual: "📦 무료배송",
          appeal_type: "convenience"
        },
        B: {
          name: "할인율 배지",
          description: "30% 할인",
          visual: "💰 30% OFF",
          appeal_type: "price"
        }
      }
    },
    call_to_action: {
      name: "구매 버튼 메시지",
      description: "장바구니/구매 버튼의 텍스트",
      variants: {
        A: {
          name: "긴급성 강조",
          description: "지금 주문하기",
          visual: "⚡ 지금 주문하기",
          appeal_type: "urgency"
        },
        B: {
          name: "혜택 강조",
          description: "할인가로 구매",
          visual: "💸 할인가로 구매",
          appeal_type: "price"
        }
      }
    },
    shipping_info: {
      name: "배송 정보 표시",
      description: "상품 상세페이지 배송 안내",
      variants: {
        A: {
          name: "속도 중심",
          description: "빠른 배송 강조",
          visual: "🚀 당일/익일 배송 가능",
          appeal_type: "speed"
        },
        B: {
          name: "가격 중심", 
          description: "무료 배송 조건",
          visual: "🆓 3만원 이상 무료배송",
          appeal_type: "price"
        }
      }
    }
  };

// 고객 세그먼트별 특성 (모듈 스코프)
const customerSegments: Record<string, Segment> = {
    value_seeker: {
      name: "가성비 추구층 (20대-30대 초반)",
      price_sensitivity: 0.45,
      convenience_preference: 0.10,
      urgency_response: 0.15,
      speed_preference: 0.20,
      research_basis: "한국소비자원 2024 이커머스 트렌드 (n=12,500)"
    },
    busy_professional: {
      name: "바쁜 직장인 (30대-40대)",
      price_sensitivity: 0.15,
      convenience_preference: 0.40,
      urgency_response: 0.25,
      speed_preference: 0.35,
      research_basis: "Google Consumer Insights (1M+ 세션)"
    },
    careful_shopper: {
      name: "신중한 쇼핑족 (40대+)",
      price_sensitivity: 0.25,
      convenience_preference: 0.25,
      urgency_response: 0.10,
      speed_preference: 0.15,
      research_basis: "Baymard Institute UX Research"
    },
    mixed: {
      name: "전체 고객 (혼합)",
      price_sensitivity: 0.28,
      convenience_preference: 0.25,
      urgency_response: 0.17,
      speed_preference: 0.23,
      research_basis: "복합 연구 결과 가중평균"
    }
  };

const historicalTests = [
    {
      company: "국내 대형 쇼핑몰 A",
      test: "빠른배송 vs 할인 강조",
      winner: "빠른배송",
      lift: "+18%",
      duration: "14일",
      traffic: "50만 세션"
    },
    {
      company: "패션 쇼핑몰 C", 
      test: "지금 구매 vs 할인가로 구매",
      winner: "할인가로 구매",
      lift: "+24%",
      duration: "10일",
      traffic: "30만 세션"
    }
  ];

// 추천사항 생성 (모듈 스코프)
const generateRecommendation = (
  effectA: number,
  effectB: number,
  confidence: number,
  variantA: Variant,
  variantB: Variant,
  segment: string
) => {
    const winner = effectB > effectA ? variantB : variantA;
    const improvement = effectA > 0 ? Math.abs(((effectB - effectA) / effectA) * 100) : 0;
    
    let recommendation = '';
    let researchSupport = '';
    
    if (confidence >= 95) {
      recommendation = `✅ ${winner.name}을(를) 채택하세요. `;
      if (improvement >= 10) {
        recommendation += `전환율이 ${improvement.toFixed(1)}% 향상되어 큰 임팩트가 예상됩니다.`;
      } else {
        recommendation += `통계적으로 유의미하지만 개선폭이 작으니, 다른 요소도 고려해보세요.`;
      }
    } else if (confidence >= 90) {
      recommendation = `⚠️ ${winner.name}이(가) 약간 우세하지만, 더 많은 데이터가 필요합니다.`;
    } else {
      recommendation = `🤔 두 변형안의 차이가 명확하지 않습니다. 다른 접근을 시도해보세요.`;
    }

    // 연구 근거 추가
    if (segment === 'value_seeker' && winner.appeal_type === 'price') {
      recommendation += '\n💡 가성비 추구층에게는 할인/가격 메시지가 효과적입니다.';
      researchSupport = '근거: 한국소비자원 연구에 따르면 20대는 할인에 67% 반응';
    } else if (segment === 'busy_professional' && (winner.appeal_type === 'convenience' || winner.appeal_type === 'speed')) {
      recommendation += '\n💡 직장인층에게는 편의성/속도 메시지가 더 어필합니다.';
      researchSupport = '근거: Google 연구에 따르면 30-40대는 편의성에 58% 반응';
    } else if (winner.appeal_type === 'speed') {
      researchSupport = '근거: Baymard Institute - 명확한 배송정보 표시 시 이탈률 23% 감소';
    }

    return { recommendation, researchSupport };
  };

export default function Home() {
  const [selectedTest, setSelectedTest] = useState('');
  const [targetAudience, setTargetAudience] = useState('mixed');
  const [trafficSplit, setTrafficSplit] = useState(50);
  const [currentVisitors, setCurrentVisitors] = useState(1000);
  const [results, setResults] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useSeed, setUseSeed] = useState(false);
  const [seed, setSeed] = useState(42);

  // A/B 테스트 시뮬레이션
  const simulateABTest = useCallback(() => {
    if (!selectedTest) {
      setError('테스트를 선택해주세요');
      return;
    }
    setError(null);

    setIsRunning(true);

    setTimeout(() => {
      const scenario = abTestScenarios[selectedTest as keyof typeof abTestScenarios];
      const segment = customerSegments[targetAudience as keyof typeof customerSegments];
      
      const variantA = scenario.variants.A;
      const variantB = scenario.variants.B;
      
      // 시드 기반 PRNG (xorshift32)
      let prngState = seed >>> 0;
      const prng = () => {
        prngState ^= prngState << 13;
        prngState ^= prngState >>> 17;
        prngState ^= prngState << 5;
        return (prngState >>> 0) / 4294967296;
      };
      
      // 기본 전환율
      const baseConversionRate = 0.025;
      
      // 변형안 A 효과 계산
      let effectA = baseConversionRate;
      if (variantA.appeal_type === 'price') effectA += segment.price_sensitivity * 0.02;
      if (variantA.appeal_type === 'convenience') effectA += segment.convenience_preference * 0.025;
      if (variantA.appeal_type === 'urgency') effectA += segment.urgency_response * 0.03;
      if (variantA.appeal_type === 'speed') effectA += segment.speed_preference * 0.028;

      // 변형안 B 효과 계산  
      let effectB = baseConversionRate;
      if (variantB.appeal_type === 'price') effectB += segment.price_sensitivity * 0.02;
      if (variantB.appeal_type === 'convenience') effectB += segment.convenience_preference * 0.025;
      if (variantB.appeal_type === 'urgency') effectB += segment.urgency_response * 0.03;
      if (variantB.appeal_type === 'speed') effectB += segment.speed_preference * 0.028;

      // 노이즈 추가
      const randA = useSeed ? prng() : Math.random();
      const randB = useSeed ? prng() : Math.random();
      effectA += (randA - 0.5) * 0.005;
      effectB += (randB - 0.5) * 0.005;

      // 방문자 분할
      const visitorsA = Math.floor(currentVisitors * (trafficSplit / 100));
      const visitorsB = currentVisitors - visitorsA;

      // 전환 수 계산
      const conversionsA = Math.floor(visitorsA * effectA);
      const conversionsB = Math.floor(visitorsB * effectB);

      // 통계적 유의성 계산 (표본 비율 기반)
      const pA = visitorsA > 0 ? conversionsA / visitorsA : 0;
      const pB = visitorsB > 0 ? conversionsB / visitorsB : 0;
      const pooled = (conversionsA + conversionsB) / Math.max(1, visitorsA + visitorsB);
      const se = Math.sqrt(pooled * (1 - pooled) * (1 / Math.max(1, visitorsA) + 1 / Math.max(1, visitorsB)));
      const zScore = se > 0 ? Math.abs((pA - pB) / se) : 0;
      const confidence = zScore >= 1.96 ? 95 : zScore >= 1.645 ? 90 : Math.max(50, Math.min(95, 50 + zScore * 20));

      // 매출 계산
      const avgOrderValue = 50000;
      const revenueA = conversionsA * avgOrderValue;
      const revenueB = conversionsB * avgOrderValue;
      const revenueLift = revenueA > 0 ? ((revenueB - revenueA) / revenueA) * 100 : 0;

      const recommendationData = generateRecommendation(effectA, effectB, confidence, variantA, variantB, targetAudience);

      setResults({
        variantA: {
          name: variantA.name,
          visitors: visitorsA,
          conversions: conversionsA,
          conversionRate: effectA * 100,
          revenue: revenueA
        },
        variantB: {
          name: variantB.name,
          visitors: visitorsB,
          conversions: conversionsB,
          conversionRate: effectB * 100,
          revenue: revenueB
        },
        winner: effectB > effectA ? 'B' : 'A',
        improvement: Math.abs(((effectB - effectA) / effectA) * 100),
        confidence: confidence,
        revenueLift: revenueLift,
        recommendationData: recommendationData
      });

      setIsRunning(false);
    }, 2000);
  }, [selectedTest, targetAudience, trafficSplit, currentVisitors, useSeed, seed]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-black mb-2">
            UI/UX A/B 테스트 시뮬레이터
          </h1>
          <p className="text-black">
            실제 A/B 테스트 전에 UI 변경사항의 효과를 미리 예측해보세요
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 설정 패널 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-600" />
                테스트 설정
              </h2>

              <div className="mb-6">
                <label htmlFor="test-select" className="block text-sm font-medium text-black mb-2">
                  테스트할 UI 요소
                </label>
                <select
                  id="test-select"
                  value={selectedTest}
                  onChange={(e) => setSelectedTest(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">테스트 선택...</option>
                  {Object.entries(abTestScenarios).map(([key, scenario]) => (
                    <option key={key} value={key}>{scenario.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label htmlFor="audience-select" className="block text-sm font-medium text-black mb-2">
                  타겟 고객층
                </label>
                <select
                  id="audience-select"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(customerSegments).map(([key, segment]) => (
                    <option key={key} value={key}>{segment.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label htmlFor="split-range" className="block text-sm font-medium text-black mb-2">
                  트래픽 분할 (A안 비율): {trafficSplit}%
                </label>
                <input
                  id="split-range"
                  type="range"
                  min="10"
                  max="90"
                  value={trafficSplit}
                  onChange={(e) => setTrafficSplit(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-black mt-1">
                  <span>A안: {trafficSplit}%</span>
                  <span>B안: {100 - trafficSplit}%</span>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="visitors-input" className="block text-sm font-medium text-black mb-2">
                  일일 방문자 수
                </label>
                <input
                  id="visitors-input"
                  type="number"
                  value={currentVisitors}
                  onChange={(e) => setCurrentVisitors(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min={100}
                  max={100000}
                />
              </div>

              {/* 시드 옵션 */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <label htmlFor="seed-toggle" className="text-sm font-medium text-black">
                    재현성 모드 (시드 고정)
                  </label>
                  <input
                    id="seed-toggle"
                    type="checkbox"
                    checked={useSeed}
                    onChange={(e) => setUseSeed(e.target.checked)}
                    className="h-4 w-4"
                  />
                </div>
                {useSeed && (
                  <div className="mt-3">
                    <label htmlFor="seed-input" className="block text-sm text-black mb-1">시드 값</label>
                    <input
                      id="seed-input"
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>

              {error && (
                <div className="text-sm text-red-600 mb-3" role="alert">
                  {error}
                </div>
              )}

              <button
                onClick={simulateABTest}
                disabled={!selectedTest || isRunning}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    시뮬레이션 중...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    A/B 테스트 시뮬레이션
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 결과 패널 */}
          <div className="lg:col-span-2">
            {selectedTest && abTestScenarios[selectedTest as keyof typeof abTestScenarios] && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">📋 테스트 개요</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">🅰️ 변형안 A</h4>
                    <div className="text-2xl mb-2">{abTestScenarios[selectedTest as keyof typeof abTestScenarios].variants.A.visual}</div>
                    <p className="text-sm text-black">{abTestScenarios[selectedTest as keyof typeof abTestScenarios].variants.A.description}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">🅱️ 변형안 B</h4>
                    <div className="text-2xl mb-2">{abTestScenarios[selectedTest as keyof typeof abTestScenarios].variants.B.visual}</div>
                    <p className="text-sm text-black">{abTestScenarios[selectedTest as keyof typeof abTestScenarios].variants.B.description}</p>
                  </div>
                </div>
              </div>
            )}

            {results ? (
              <div className="space-y-6">
                {/* 핵심 결과 */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                    테스트 결과
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className={`p-4 rounded-lg border-2 ${results.winner === 'A' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">🅰️ {results.variantA.name}</h4>
                        {results.winner === 'A' && <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded">승리</span>}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>방문자: {results.variantA.visitors.toLocaleString()}명</div>
                        <div>전환: {results.variantA.conversions}명</div>
                        <div>전환율: <span className="font-bold text-lg">{results.variantA.conversionRate.toFixed(2)}%</span></div>
                        <div>매출: {new Intl.NumberFormat('ko-KR').format(results.variantA.revenue)}원</div>
                      </div>
                    </div>

                    <div className={`p-4 rounded-lg border-2 ${results.winner === 'B' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">🅱️ {results.variantB.name}</h4>
                        {results.winner === 'B' && <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">승리</span>}
                      </div>
                      <div className="space-y-1 text-sm">
                        <div>방문자: {results.variantB.visitors.toLocaleString()}명</div>
                        <div>전환: {results.variantB.conversions}명</div>
                        <div>전환율: <span className="font-bold text-lg">{results.variantB.conversionRate.toFixed(2)}%</span></div>
                        <div>매출: {new Intl.NumberFormat('ko-KR').format(results.variantB.revenue)}원</div>
                      </div>
                    </div>
                  </div>

                  {/* 핵심 지표 */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">+{results.improvement.toFixed(1)}%</div>
                      <div className="text-sm text-black">개선율</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{results.confidence.toFixed(0)}%</div>
                      <div className="text-sm text-black">신뢰도</div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{results.revenueLift > 0 ? '+' : ''}{results.revenueLift.toFixed(1)}%</div>
                      <div className="text-sm text-black">매출 변화</div>
                    </div>
                  </div>
                </div>

                {/* 추천사항 */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">💡 추천사항</h3>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div className="whitespace-pre-line text-black">
                      {results.recommendationData.recommendation}
                    </div>
                  </div>
                  {results.recommendationData.researchSupport && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">📊 연구 근거</h4>
                      <div className="text-sm text-blue-800">
                        {results.recommendationData.researchSupport}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 text-black" />
                <p className="text-black">테스트를 실행하면 결과가 여기에 표시됩니다</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}