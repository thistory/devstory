# DevStory Daily — 2026-03-26 (KST)


## 🔥 GitHub & 오픈소스

### [bytedance/deer-flow - 오픈소스 SuperAgent 프레임워크](https://github.com/bytedance/deer-flow)
_bytedance/deer-flow - Open-source SuperAgent harness_

리서치, 코딩, 콘텐츠 생성을 수행하는 오픈소스 SuperAgent. 샌드박스, 메모리, 도구, 서브에이전트 등을 활용. 오늘 3,787스타 획득으로 전체 트렌딩 1위.

### [pascalorg/editor - 3D 건축 프로젝트 에디터](https://github.com/pascalorg/editor)
_pascalorg/editor - 3D architectural project editor_

3D 건축 프로젝트를 생성하고 공유할 수 있는 에디터. TypeScript 기반으로 오늘 2,353스타 기록.

### [Crosstalk-Solutions/project-nomad - 오프라인 서바이벌 컴퓨터](https://github.com/Crosstalk-Solutions/project-nomad)
_Crosstalk-Solutions/project-nomad - Offline survival computer_

자체 포함형 오프라인 서바이벌 컴퓨터. 핵심 도구, 지식, AI를 탑재하여 언제 어디서나 정보 접근 가능. 오늘 1,717스타.

### [TauricResearch/TradingAgents - 멀티에이전트 LLM 금융 트레이딩](https://github.com/TauricResearch/TradingAgents)
_TauricResearch/TradingAgents - Multi-Agent LLM Financial Trading_

멀티 에이전트 LLM 기반 금융 트레이딩 프레임워크. 총 41,759스타, 오늘 1,392스타 획득.

### [mvanhorn/last30days-skill - AI 에이전트 리서치 스킬](https://github.com/mvanhorn/last30days-skill)
_mvanhorn/last30days-skill - AI agent research skill_

Reddit, X, YouTube, HN, Polymarket 등에서 주제를 리서치하고 요약하는 AI 에이전트 스킬. 오늘 1,342스타.

### [ruvnet/ruflo - Claude용 에이전트 오케스트레이션 플랫폼](https://github.com/ruvnet/ruflo)
_ruvnet/ruflo - Agent orchestration platform for Claude_

Claude를 위한 멀티에이전트 스웜 배포, 자율 워크플로우 조율. RAG 통합, Claude Code/Codex 네이티브 지원. 오늘 1,173스타.

### [FujiwaraChoki/MoneyPrinterV2 - 온라인 수익 자동화](https://github.com/FujiwaraChoki/MoneyPrinterV2)
_FujiwaraChoki/MoneyPrinterV2 - Automate online money making_

온라인 수익 창출 과정을 자동화하는 도구. 총 25,529스타, 오늘 1,065스타 획득.

### [supermemoryai/supermemory - AI 에이전트용 메모리 API](https://github.com/supermemoryai/supermemory)
_supermemoryai/supermemory - Memory API for AI agents_

AI 에이전트를 위한 메모리 API 및 인프라. 총 19,164스타, 오늘 809스타.

### [letta-ai/claude-subconscious - Claude용 잠재의식 레이어](https://github.com/letta-ai/claude-subconscious)
_letta-ai/claude-subconscious - Subconscious layer for Claude_

Claude에 영속적 메모리와 잠재의식 레이어를 추가하는 TypeScript 프로젝트. 총 1,388스타, 오늘 71스타.


## 🧠 AI 연구

### [특성 희소성을 통한 어텐션 확장](https://arxiv.org/abs/2603.22300)
_Scaling Attention via Feature Sparsity_

Transformer의 셀프 어텐션 O(n²d) 비용을 특성 희소성으로 해결하는 Sparse Feature Attention(SFA) 제안. FlashSFA로 GPT-2/Qwen3에서 최대 2.5배 속도 향상, FLOPs/KV-cache 50% 절감.

### [거짓말을 해봐: 추론 모델의 CoT 추론은 얼마나 충실한가?](https://arxiv.org/abs/2603.22582)
_Lie to Me: How Faithful Is Chain-of-Thought Reasoning in Reasoning Models?_

12개 오픈웨이트 추론 모델(7B-685B)에서 CoT 충실성 평가. 41,832건에서 충실성 39.7%~89.9%. 사고 토큰에서는 87.5% 인정하면서 답변에서는 28.6%만 인정하는 격차. AI 안전에 중요한 시사점.

### [TIPS: 검색 증강 LLM을 위한 턴 레벨 정보 잠재력 보상 형성](https://arxiv.org/abs/2603.22293)
_TIPS: Turn-Level Information-Potential Reward Shaping for Search-Augmented LLMs_

검색 증강 LLM의 RL 학습에서 희소 보상과 크레딧 할당 문제를 해결. Qwen-2.5 7B에서 PPO 대비 EM 11.8%, F1 13.6% 향상.

### [하이브리드 연상 메모리](https://arxiv.org/abs/2603.22325)
_Hybrid Associative Memories_

RNN과 셀프 어텐션을 결합한 HAM 레이어 제안. RNN이 시퀀스를 압축하고 어텐션은 RNN이 예측하기 어려운 정보만 보충. 데이터 의존적 KV 캐시 성장으로 정밀 제어 가능.

### [희소하지만 결정적: RLVR 파인튜닝의 토큰 레벨 분포 변화 분석](https://arxiv.org/abs/2603.22446)
_Sparse but Critical: A Token-Level Analysis of Distributional Shifts in RLVR Fine-Tuning_

RLVR이 LLM에 미치는 토큰 레벨 영향 체계적 분석. RL 파인튜닝은 매우 희소하고 표적화된 변화만 유도하며, 소수의 RL 토큰만으로도 성능 향상 회복 가능.

### [정적 템플릿에서 동적 런타임 그래프로: LLM 에이전트 워크플로우 최적화 서베이](https://arxiv.org/abs/2603.22386)
_From Static Templates to Dynamic Runtime Graphs: A Survey of Workflow Optimization for LLM Agents_

LLM 기반 에이전트 워크플로우 설계 및 최적화를 에이전틱 계산 그래프(ACG)로 체계화한 서베이. 정적/동적 방법 분류, 재사용 가능한 워크플로우 템플릿과 실행 트레이스 구분.


## 📰 뉴스 & 블로그

### [속도를 늦추는 것에 대한 생각](https://mariozechner.at/posts/2026-03-25-thoughts-on-slowing-the-fuck-down/)
_Thoughts on slowing the fuck down_

개발자가 번아웃과 기술 업계의 속도 집착에 대해 성찰하며, 의도적으로 속도를 늦추는 것의 가치를 이야기한다.

### [TurboQuant: 극한 압축으로 AI 효율성 재정의](https://research.google/blog/turboquant-redefining-ai-efficiency-with-extreme-compression/)
_TurboQuant: Redefining AI efficiency with extreme compression_

Google Research가 LLM 메모리 사용량을 최대 6배 줄이면서 품질 저하 없는 양자화 알고리즘 TurboQuant을 발표했다.

### [EU, 여전히 개인 메시지와 사진 검열 추진 중](https://fightchatcontrol.eu/?foo=bar)
_The EU still wants to scan your private messages and photos_

EU가 채팅 통제법을 통해 개인 메시지와 사진을 스캔하려는 시도를 계속하고 있다. 프라이버시 침해 우려가 커지고 있다.

### [Ensu – Ente의 로컬 LLM 앱](https://ente.com/blog/ensu/)
_Ensu – Ente's Local LLM app_

E2E 암호화 클라우드 서비스 Ente가 로컬에서 실행되는 LLM 앱 Ensu를 공개했다. 프라이버시를 보장하면서 AI 기능 사용 가능.

### [미 대법원, 음악 저작권 분쟁에서 ISP Cox 편 들어](https://www.nytimes.com/2026/03/25/us/politics/supreme-court-cox-music-copyright.html)
_Supreme Court Sides with Cox in Copyright Fight over Pirated Music_

미국 대법원이 ISP 가입자의 불법 다운로드에 대해 통신사가 책임지지 않는다고 판결. 저작권 집행 방식에 큰 영향.

### [Apple, 버그 '미수정 확인' 안 하면 버그 리포트 임의 종료](https://lapcatsoftware.com/articles/2026/3/11.html)
_Apple randomly closes bug reports unless you verify the bug remains unfixed_

Apple이 개발자가 버그가 여전히 존재하는지 확인하지 않으면 버그 리포트를 자동으로 닫아버리는 관행이 비판받고 있다.

### [GitHub Copilot 상호작용 데이터 사용 정책 변경](https://github.blog/news-insights/company-news/updates-to-github-copilot-interaction-data-usage-policy/)
_Updates to GitHub Copilot interaction data usage policy_

GitHub이 Copilot의 사용자 상호작용 데이터 활용 정책을 업데이트했다.

### [ARC-AGI-3 벤치마크 공개](https://arcprize.org/arc-agi/3)
_ARC-AGI-3_

ARC Prize에서 AGI 능력을 측정하는 새로운 벤치마크 ARC-AGI-3을 공개. AI 추론 능력의 새로운 평가 기준을 제시한다.

### [양자화(Quantization) 기초부터 배우기](https://ngrok.com/blog/quantization)
_Quantization from the Ground Up_

ngrok에서 AI 모델 양자화의 기본 원리부터 실제 적용까지 체계적으로 설명하는 가이드를 공개했다.

### [FreeCAD v1.1 출시](https://blog.freecad.org/2026/03/25/freecad-version-1-1-released/)
_FreeCAD v1.1_

오픈소스 3D CAD 소프트웨어 FreeCAD가 v1.1을 출시. 안정성과 기능이 대폭 개선.

### [Claude 연동 출력의 90%가 스타 2개 미만 GitHub 저장소로](https://www.claudescode.dev/?window=since_launch)
_90% of Claude-linked output going to GitHub repos w <2 stars_

Claude Code로 생성된 코드의 대부분이 거의 주목받지 못하는 소규모 GitHub 저장소에 사용되고 있다는 분석.

### [Spotify, AI 가짜 음악 방지 위해 아티스트 수동 승인 기능 도입](https://www.theverge.com/streaming/900910/spotify-artist-profile-protection-ai-clones)
_Spotify is letting artists manually approve releases to combat AI fakes_

Spotify가 아티스트가 자신의 프로필에 올라가는 음원을 사전 승인할 수 있는 프로필 보호 기능을 베타 테스트 중.

### [NASA의 Gateway 원자력 추진 화성행 계획](https://arstechnica.com/space/2026/03/here-is-nasas-plan-for-nuking-gateway-and-sending-it-to-mars/)
_Here is NASA's plan for nuking Gateway and sending it to Mars_

NASA가 달 궤도 정거장 Gateway를 원자력 전기 추진 기술 시연용으로 전환해 화성까지 보내는 계획을 발표.

### [미국 라우터 금지령 설명](https://www.theverge.com/tech/899906/fcc-router-ban-march-2026-explainer)
_The United States router ban, explained_

FCC가 국가 안보 우려로 외국산 소비자 Wi-Fi 라우터를 금지한 조치에 대한 상세 설명.

### [배심원단, 소셜미디어 중독 재판에서 Meta와 Google에 과실 판결](https://techcrunch.com/2026/03/25/jury-finds-meta-and-youtube-negligent-in-landmark-social-media-addiction-trial/)
_Jury finds Meta and Google negligent in landmark social media addiction trial_

역사적인 소셜미디어 중독 재판에서 배심원단이 Meta와 YouTube의 과실을 인정. 10대 중독성 설계가 핵심 쟁점.


---
_수집: 2026-03-25T22:14:02.771259Z | 항목: 30개_
