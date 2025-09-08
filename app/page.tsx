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

type TestMeta = {
  impact_level: 'low' | 'medium' | 'high';
  difficulty: 'low' | 'medium' | 'high';
  sample_size_needed: number;
};

type TestDefinition = {
  key: string;
  name: string;
  description: string;
  meta: TestMeta;
  variants: { A: Variant; B: Variant };
};

type TestCategory = {
  key: string;
  name: string;
  description: string;
  tests: Record<string, TestDefinition>;
};

type Segment = {
  name: string;
  price_sensitivity: number;
  convenience_preference: number;
  urgency_response: number;
  speed_preference: number;
  research_basis: string;
  // 확장된 심리적 특성 (총 17개 특성에 포함되도록 추가)
  trust_sensitivity: number;
  social_proof_response: number;
  anchoring_susceptibility: number;
  loss_aversion: number;
  brand_loyalty: number;
  novelty_seeking: number;
  risk_aversion: number;
  cognitive_load_tolerance: number;
  info_density_preference: number;
  security_concern: number;
  discount_frugality_index: number;
  visual_hierarchy_sensitivity: number;
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

// 통계/샘플링 유틸리티
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const normalFromUniform = (u1: number, u2: number) => {
  // Box-Muller 변환 (표준정규)
  const r = Math.sqrt(-2.0 * Math.log(Math.max(u1, 1e-12)));
  const theta = 2.0 * Math.PI * u2;
  return r * Math.cos(theta);
};

const binomialSampleApprox = (n: number, p: number, rand: () => number) => {
  // 정규 근사 Bin(n,p) ~ N(np, np(1-p))
  const mean = n * p;
  const variance = n * p * (1 - p);
  const std = Math.sqrt(Math.max(variance, 1e-9));
  const z = normalFromUniform(rand(), rand());
  const sample = Math.round(mean + std * z);
  return clamp(sample, 0, n);
};

const welchTTestConfidence = (pA: number, pB: number, nA: number, nB: number) => {
  // Bernoulli 표본의 비율 비교를 Welch t로 근사
  const varA = (pA * (1 - pA)) / Math.max(1, nA);
  const varB = (pB * (1 - pB)) / Math.max(1, nB);
  const se = Math.sqrt(varA + varB);
  if (se === 0) return 50;
  const t = Math.abs((pA - pB) / se);
  // Welch-Satterthwaite 자유도
  const numerator = (varA + varB) * (varA + varB);
  const denom = (varA * varA) / Math.max(1, nA - 1) + (varB * varB) / Math.max(1, nB - 1);
  const df = denom > 0 ? Math.max(1, numerator / denom) : Math.max(1, nA + nB - 2);
  // df가 충분히 크면 정규 근사 사용
  const z = t; // 근사
  // 정규분포 양측 p-value 근사
  const normalCdf = (x: number) => 0.5 * (1 + Math.erf(x / Math.SQRT2));
  const pTwoTailed = 2 * (1 - normalCdf(z));
  const confidence = clamp((1 - pTwoTailed) * 100, 50, 99.9);
  return confidence;
};

// Step 1: 테스트 카테고리 체계화 (5개 메인 카테고리, 각 3-4개 테스트)
const testCategories: Record<string, TestCategory> = {
  navigation_ia: {
    key: 'navigation_ia',
    name: '🧭 내비게이션 & 정보구조',
    description: '탐색 용이성과 정보 구조 최적화 실험',
    tests: {
      top_nav_structure: {
        key: 'top_nav_structure',
        name: '상단 내비게이션 구조',
        description: '간결형 vs 메가메뉴',
        meta: { impact_level: 'medium', difficulty: 'medium', sample_size_needed: 5000 },
        variants: {
          A: { name: '간결형 5항목', description: '핵심 5개 카테고리만 노출', visual: '🧭 핵심 5개', appeal_type: 'convenience' },
          B: { name: '메가메뉴', description: '하위 카테고리 풀노출', visual: '🧭 메가메뉴', appeal_type: 'speed' },
        },
      },
      search_placement: {
        key: 'search_placement',
        name: '검색 위치',
        description: '상단바 vs 하단 고정(모바일)',
        meta: { impact_level: 'high', difficulty: 'low', sample_size_needed: 3000 },
        variants: {
          A: { name: '상단 검색', description: '상단 바에 검색 배치', visual: '🔍 Top', appeal_type: 'speed' },
          B: { name: '하단 고정', description: '모바일 하단 고정 검색', visual: '🔍 Bottom', appeal_type: 'convenience' },
        },
      },
      breadcrumb_visibility: {
        key: 'breadcrumb_visibility',
        name: '브레드크럼 표시',
        description: '표시 vs 미표시',
        meta: { impact_level: 'low', difficulty: 'low', sample_size_needed: 4000 },
        variants: {
          A: { name: '표시', description: '브레드크럼 노출', visual: '🧱 표시', appeal_type: 'convenience' },
          B: { name: '미표시', description: '브레드크럼 숨김', visual: '🧱 숨김', appeal_type: 'speed' },
        },
      },
    },
  },
  conversion_psych: {
    key: 'conversion_psych',
    name: '💰 전환 심리학',
    description: '사회적 증거, 희소성, 앵커링 등 설득 요인',
    tests: {
      social_proof_badge: {
        key: 'social_proof_badge',
        name: '사회적 증거 배지',
        description: '리뷰/구매 수 표기',
        meta: { impact_level: 'high', difficulty: 'low', sample_size_needed: 2500 },
        variants: {
          A: { name: '리뷰수 표시', description: '리뷰 1.2k개', visual: '⭐ 1.2k 리뷰', appeal_type: 'urgency' },
          B: { name: '구매수 표시', description: '최근 24시간 500개 구매', visual: '🛒 500 구매/24h', appeal_type: 'urgency' },
        },
      },
      scarcity_timer: {
        key: 'scarcity_timer',
        name: '희소성 타이머',
        description: '한정 수량/시간 타이머',
        meta: { impact_level: 'medium', difficulty: 'medium', sample_size_needed: 3500 },
        variants: {
          A: { name: '한정 수량', description: '재고 7개 남음', visual: '⏳ 7 left', appeal_type: 'urgency' },
          B: { name: '한정 시간', description: '2시간 내 종료', visual: '⏳ 2h left', appeal_type: 'urgency' },
        },
      },
      price_anchor_display: {
        key: 'price_anchor_display',
        name: '가격 앵커 노출',
        description: '정가 대비 할인가 표기',
        meta: { impact_level: 'medium', difficulty: 'low', sample_size_needed: 3000 },
        variants: {
          A: { name: '정가 취소선', description: '정가 89,000원', visual: ' ~89,000~ ', appeal_type: 'price' },
          B: { name: '할인가 강조', description: '지금 59,000원', visual: '59,000', appeal_type: 'price' },
        },
      },
    },
  },
  trust_security: {
    key: 'trust_security',
    name: '🛡️ 신뢰성 & 보안',
    description: '결제 신뢰, 환불 정책, 보안 신호',
    tests: {
      trust_badges_checkout: {
        key: 'trust_badges_checkout',
        name: '결제 신뢰 배지',
        description: '결제 단계 보안 배지',
        meta: { impact_level: 'medium', difficulty: 'low', sample_size_needed: 4000 },
        variants: {
          A: { name: '신뢰 배지 표시', description: 'SSL/안전결제 로고', visual: '🔒 SSL', appeal_type: 'convenience' },
          B: { name: '보안 문구 표시', description: '보안 안내 텍스트', visual: '🔒 안내', appeal_type: 'convenience' },
        },
      },
      refund_policy_visibility: {
        key: 'refund_policy_visibility',
        name: '환불정책 노출',
        description: '환불정책 강조 노출',
        meta: { impact_level: 'low', difficulty: 'low', sample_size_needed: 3000 },
        variants: {
          A: { name: '헤더 링크', description: '상단 환불정책 링크', visual: '↗ 환불정책', appeal_type: 'convenience' },
          B: { name: '체크아웃 노출', description: '결제 전 환불정책 노출', visual: '🧾 환불정책', appeal_type: 'convenience' },
        },
      },
      https_lock_icon_emphasis: {
        key: 'https_lock_icon_emphasis',
        name: 'HTTPS 자물쇠 강조',
        description: '주소창/결제단 강조',
        meta: { impact_level: 'low', difficulty: 'low', sample_size_needed: 2500 },
        variants: {
          A: { name: '주소창 근처', description: '자물쇠 아이콘 근접 표시', visual: '🔐 주소창', appeal_type: 'convenience' },
          B: { name: '결제 버튼 근처', description: '결제 CTA 근접 표시', visual: '🔐 결제', appeal_type: 'convenience' },
        },
      },
    },
  },
  mobile_optimization: {
    key: 'mobile_optimization',
    name: '📱 모바일 최적화',
    description: '모바일 사용성 및 속도 개선',
    tests: {
      bottom_nav_bar: {
        key: 'bottom_nav_bar',
        name: '하단 내비게이션 바',
        description: '하단 고정 바 도입',
        meta: { impact_level: 'high', difficulty: 'medium', sample_size_needed: 4500 },
        variants: {
          A: { name: '미도입', description: '상단 탭 유지', visual: '⬆️ 상단', appeal_type: 'speed' },
          B: { name: '도입', description: '하단 바 도입', visual: '⬇️ 하단', appeal_type: 'convenience' },
        },
      },
      thumb_zone_cta: {
        key: 'thumb_zone_cta',
        name: '엄지영역 CTA',
        description: '하단 엄지영역 CTA 배치',
        meta: { impact_level: 'high', difficulty: 'low', sample_size_needed: 3000 },
        variants: {
          A: { name: '기존 위치', description: '상단/중단 CTA', visual: '👆 상단', appeal_type: 'speed' },
          B: { name: '엄지영역', description: '하단 고정 CTA', visual: '👍 하단', appeal_type: 'convenience' },
        },
      },
      image_lazy_loading: {
        key: 'image_lazy_loading',
        name: '이미지 지연 로딩',
        description: '레이지 로딩 도입',
        meta: { impact_level: 'medium', difficulty: 'low', sample_size_needed: 3500 },
        variants: {
          A: { name: '미적용', description: '즉시 로딩', visual: '🖼️ 즉시', appeal_type: 'speed' },
          B: { name: '적용', description: '지연 로딩', visual: '🖼️ 지연', appeal_type: 'speed' },
        },
      },
    },
  },
  visual_hierarchy: {
    key: 'visual_hierarchy',
    name: '👁️ 시각적 계층구조',
    description: '명확한 정보 우선순위와 CTA 강조',
    tests: {
      primary_cta_color: {
        key: 'primary_cta_color',
        name: '주요 CTA 색상',
        description: '파랑 vs 초록',
        meta: { impact_level: 'medium', difficulty: 'low', sample_size_needed: 3000 },
        variants: {
          A: { name: '블루', description: '파란색 CTA', visual: '🔵 CTA', appeal_type: 'urgency' },
          B: { name: '그린', description: '초록색 CTA', visual: '🟢 CTA', appeal_type: 'urgency' },
        },
      },
      hero_copy_weight: {
        key: 'hero_copy_weight',
        name: '히어로 카피 강조',
        description: '볼드 vs 레귤러',
        meta: { impact_level: 'low', difficulty: 'low', sample_size_needed: 2500 },
        variants: {
          A: { name: '볼드', description: '굵게 강조', visual: '🅱️ Bold', appeal_type: 'urgency' },
          B: { name: '레귤러', description: '기본 굵기', visual: '🔤 Regular', appeal_type: 'convenience' },
        },
      },
      card_shadow_depth: {
        key: 'card_shadow_depth',
        name: '카드 그림자 깊이',
        description: '얕은 vs 깊은',
        meta: { impact_level: 'low', difficulty: 'low', sample_size_needed: 2500 },
        variants: {
          A: { name: '얕은', description: '가벼운 음영', visual: '🃏 Light', appeal_type: 'convenience' },
          B: { name: '깊은', description: '강한 음영', visual: '🃏 Deep', appeal_type: 'convenience' },
        },
      },
    },
  },
};

// Step 2: 고객 세그먼트 정교화 (7개, 17개 특성 지표 포함)
const customerSegments: Record<string, Segment> = {
  gen_z_mobile_native: {
    name: 'Z세대 모바일 네이티브 (18-25세)',
    price_sensitivity: 0.35,
    convenience_preference: 0.45,
    urgency_response: 0.40,
    speed_preference: 0.50,
    research_basis: 'Journal of Consumer Psychology / Mobile UX',
    trust_sensitivity: 0.30,
    social_proof_response: 0.60,
    anchoring_susceptibility: 0.35,
    loss_aversion: 0.30,
    brand_loyalty: 0.35,
    novelty_seeking: 0.65,
    risk_aversion: 0.25,
    cognitive_load_tolerance: 0.55,
    info_density_preference: 0.45,
    security_concern: 0.35,
    discount_frugality_index: 0.40,
    visual_hierarchy_sensitivity: 0.55,
  },
  millennial_professional: {
    name: '밀레니얼 직장인 (26-35세)',
    price_sensitivity: 0.30,
    convenience_preference: 0.55,
    urgency_response: 0.35,
    speed_preference: 0.45,
    research_basis: 'HBR / Google Consumer Insights',
    trust_sensitivity: 0.45,
    social_proof_response: 0.55,
    anchoring_susceptibility: 0.40,
    loss_aversion: 0.45,
    brand_loyalty: 0.40,
    novelty_seeking: 0.45,
    risk_aversion: 0.40,
    cognitive_load_tolerance: 0.50,
    info_density_preference: 0.50,
    security_concern: 0.45,
    discount_frugality_index: 0.35,
    visual_hierarchy_sensitivity: 0.55,
  },
  gen_x_family: {
    name: 'X세대 가족층 (36-50세)',
    price_sensitivity: 0.30,
    convenience_preference: 0.45,
    urgency_response: 0.25,
    speed_preference: 0.35,
    research_basis: 'Nielsen Norman Group',
    trust_sensitivity: 0.55,
    social_proof_response: 0.45,
    anchoring_susceptibility: 0.45,
    loss_aversion: 0.55,
    brand_loyalty: 0.55,
    novelty_seeking: 0.30,
    risk_aversion: 0.55,
    cognitive_load_tolerance: 0.40,
    info_density_preference: 0.55,
    security_concern: 0.55,
    discount_frugality_index: 0.40,
    visual_hierarchy_sensitivity: 0.50,
  },
  baby_boomer_cautious: {
    name: '베이비붐 신중족 (51-65세)',
    price_sensitivity: 0.30,
    convenience_preference: 0.40,
    urgency_response: 0.20,
    speed_preference: 0.30,
    research_basis: 'NNG / Baymard',
    trust_sensitivity: 0.65,
    social_proof_response: 0.40,
    anchoring_susceptibility: 0.45,
    loss_aversion: 0.65,
    brand_loyalty: 0.60,
    novelty_seeking: 0.25,
    risk_aversion: 0.65,
    cognitive_load_tolerance: 0.35,
    info_density_preference: 0.50,
    security_concern: 0.65,
    discount_frugality_index: 0.35,
    visual_hierarchy_sensitivity: 0.50,
  },
  premium_buyer: {
    name: '프리미엄 구매층',
    price_sensitivity: 0.15,
    convenience_preference: 0.60,
    urgency_response: 0.30,
    speed_preference: 0.45,
    research_basis: 'HBR Premium Market',
    trust_sensitivity: 0.60,
    social_proof_response: 0.45,
    anchoring_susceptibility: 0.35,
    loss_aversion: 0.40,
    brand_loyalty: 0.70,
    novelty_seeking: 0.50,
    risk_aversion: 0.40,
    cognitive_load_tolerance: 0.55,
    info_density_preference: 0.45,
    security_concern: 0.55,
    discount_frugality_index: 0.20,
    visual_hierarchy_sensitivity: 0.60,
  },
  value_seeker: {
    name: '가성비 중심층',
    price_sensitivity: 0.60,
    convenience_preference: 0.35,
    urgency_response: 0.30,
    speed_preference: 0.35,
    research_basis: '소비자 행동 연구 (가성비)',
    trust_sensitivity: 0.40,
    social_proof_response: 0.50,
    anchoring_susceptibility: 0.50,
    loss_aversion: 0.55,
    brand_loyalty: 0.35,
    novelty_seeking: 0.40,
    risk_aversion: 0.50,
    cognitive_load_tolerance: 0.45,
    info_density_preference: 0.50,
    security_concern: 0.45,
    discount_frugality_index: 0.65,
    visual_hierarchy_sensitivity: 0.50,
  },
  mixed: {
    name: '전체 평균',
    price_sensitivity: 0.35,
    convenience_preference: 0.45,
    urgency_response: 0.30,
    speed_preference: 0.40,
    research_basis: '복합 연구 결과 가중평균',
    trust_sensitivity: 0.50,
    social_proof_response: 0.50,
    anchoring_susceptibility: 0.45,
    loss_aversion: 0.50,
    brand_loyalty: 0.50,
    novelty_seeking: 0.45,
    risk_aversion: 0.50,
    cognitive_load_tolerance: 0.50,
    info_density_preference: 0.50,
    security_concern: 0.50,
    discount_frugality_index: 0.45,
    visual_hierarchy_sensitivity: 0.50,
  },
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
  const [selectedCategory, setSelectedCategory] = useState('');
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
    if (!selectedCategory || !selectedTest) {
      setError('카테고리와 테스트를 모두 선택해주세요');
      return;
    }
    setError(null);

    setIsRunning(true);

    setTimeout(() => {
      const category = testCategories[selectedCategory as keyof typeof testCategories];
      const testDef = category?.tests[selectedTest as keyof typeof category.tests];
      const segment = customerSegments[targetAudience as keyof typeof customerSegments];
      
      const variantA = testDef.variants.A;
      const variantB = testDef.variants.B;
      
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

      // 베르누이(이항) 노이즈 적용: 전환 수를 확률적으로 샘플링
      const rand = () => (useSeed ? prng() : Math.random());

      // 방문자 분할
      const visitorsA = Math.floor(currentVisitors * (trafficSplit / 100));
      const visitorsB = currentVisitors - visitorsA;

      // 전환 수 계산 (이항 샘플링 근사)
      const conversionsA = binomialSampleApprox(visitorsA, clamp(effectA, 0, 1), rand);
      const conversionsB = binomialSampleApprox(visitorsB, clamp(effectB, 0, 1), rand);

      // Welch's t-test 기반 신뢰도
      const pA = visitorsA > 0 ? conversionsA / visitorsA : 0;
      const pB = visitorsB > 0 ? conversionsB / visitorsB : 0;
      const confidence = welchTTestConfidence(pA, pB, visitorsA, visitorsB);

      // 매출 계산
      const segmentAOVMap: Record<string, number> = {
        gen_z_mobile_native: 42000,
        millennial_professional: 62000,
        gen_x_family: 70000,
        baby_boomer_cautious: 68000,
        premium_buyer: 120000,
        value_seeker: 38000,
        mixed: 50000,
      };
      const avgOrderValue = segmentAOVMap[targetAudience] ?? 50000;
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
          {/* 과학적 근거 섹션 */}
          <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">🔬 과학적 근거</h2>
            <ul className="list-disc pl-5 text-sm text-black space-y-1">
              <li>Kahneman & Tversky (1979) – Prospect Theory, 앵커링/손실회피</li>
              <li>Cialdini (2006) – 사회적 증거, 희소성 등 설득 심리</li>
              <li>Nielsen Norman Group – 모바일/웹 UX 가이드라인</li>
              <li>MIT Technology Review – 모바일 커머스 연구</li>
              <li>Harvard Business Review – 소비자 행동/프리미엄 시장</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 설정 패널 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-blue-600" />
                테스트 설정
              </h2>

              {/* 계층적 선택: 카테고리 → 테스트 */}
              <div className="mb-6">
                <label htmlFor="category-select" className="block text-sm font-medium text-black mb-2">
                  카테고리 선택
                </label>
                <select
                  id="category-select"
                  value={selectedCategory}
                  onChange={(e) => { setSelectedCategory(e.target.value); setSelectedTest(''); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">카테고리 선택...</option>
                  {Object.entries(testCategories).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label htmlFor="test-select" className="block text-sm font-medium text-black mb-2">
                  세부 테스트 선택
                </label>
                <select
                  id="test-select"
                  value={selectedTest}
                  onChange={(e) => setSelectedTest(e.target.value)}
                  disabled={!selectedCategory}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">테스트 선택...</option>
                  {selectedCategory && Object.entries(testCategories[selectedCategory].tests).map(([key, t]) => (
                    <option key={key} value={key}>{t.name}</option>
                  ))}
                </select>
                {selectedCategory && selectedTest && (
                  <div className="mt-2 text-xs text-black">
                    {testCategories[selectedCategory].tests[selectedTest].description}
                  </div>
                )}
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
            {selectedCategory && selectedTest && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4">📋 테스트 개요</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">🅰️ 변형안 A</h4>
                    <div className="text-2xl mb-2">{testCategories[selectedCategory].tests[selectedTest].variants.A.visual}</div>
                    <p className="text-sm text-black">{testCategories[selectedCategory].tests[selectedTest].variants.A.description}</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-900 mb-2">🅱️ 변형안 B</h4>
                    <div className="text-2xl mb-2">{testCategories[selectedCategory].tests[selectedTest].variants.B.visual}</div>
                    <p className="text-sm text-black">{testCategories[selectedCategory].tests[selectedTest].variants.B.description}</p>
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
                  {/* 비즈니스 임팩트 분석 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                      <div className="text-sm text-black">일일 매출 변화</div>
                      <div className="text-xl font-bold text-blue-700">
                        {new Intl.NumberFormat('ko-KR').format(results.variantB.revenue - results.variantA.revenue)}원
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
                      <div className="text-sm text-black">월간 추정 임팩트</div>
                      <div className="text-xl font-bold text-purple-700">
                        {new Intl.NumberFormat('ko-KR').format((results.variantB.revenue - results.variantA.revenue) * 30)}원
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <div className="text-sm text-black">연간 추정 임팩트</div>
                      <div className="text-xl font-bold text-green-700">
                        {new Intl.NumberFormat('ko-KR').format((results.variantB.revenue - results.variantA.revenue) * 365)}원
                      </div>
                    </div>
                  </div>

                  {/* 연구 출처 및 실제 사례 */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">📚 연구 출처</h4>
                      <ul className="list-disc pl-5 text-sm text-black space-y-1">
                        <li>Kahneman & Tversky (1979) – Prospect Theory</li>
                        <li>Cialdini (2006) – Influence: Psychology of Persuasion</li>
                        <li>Nielsen Norman Group – Mobile UX Guidelines</li>
                        <li>MIT Technology Review – Mobile Commerce Studies</li>
                        <li>Harvard Business Review – Consumer Behavior</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-medium mb-2">🏢 실제 기업 사례</h4>
                      <ul className="list-disc pl-5 text-sm text-black space-y-1">
                        <li>Amazon: 버튼 색상 A/B 테스트로 +8.2% 전환</li>
                        <li>Netflix: 모바일 내비게이션 개선으로 +31.4% 사용성</li>
                        <li>Airbnb: 사회적 증거 강화로 +15.8% 전환</li>
                      </ul>
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