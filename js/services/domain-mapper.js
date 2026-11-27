/**
 * ConfGuide — Dịch vụ Ánh xạ Topics OpenAlex sang Danh mục Lĩnh vực ConfGuide (js/services/domain-mapper.js)
 * Trang sử dụng: login.html, register.html, profile.html, index.html
 * Phụ thuộc: js/core/layout.js (window.ConfGuideUtils.PREFERENCE_TOPICS — dùng fallback nội bộ nếu chưa tải)
 * Chức năng: Phân tích `topics` và `topic_share` của tác giả từ OpenAlex, ánh xạ về 25 lĩnh vực chuẩn
 * của ConfGuide, tính điểm tin cậy (%) và quyết định khi nào xác nhận tự động hoặc chuyển sang chọn thủ công.
 */

(function () {
  'use strict';

  /* ================= 1. CẤU HÌNH NGƯỠNG & DANH MỤC 25 LĨNH VỰC ================= */

  const DEFAULT_CONFIDENCE_THRESHOLD = 60;

  const FALLBACK_TOPIC_LABELS = {
    'tri-tue-nhan-tao': 'Trí tuệ nhân tạo',
    'hoc-may': 'Học máy',
    'khoa-hoc-du-lieu': 'Khoa học dữ liệu',
    'du-lieu-lon': 'Dữ liệu lớn',
    'mang-may-tinh': 'Mạng máy tính',
    iot: 'IoT',
    'an-toan-thong-tin': 'An toàn thông tin',
    'thi-giac-may-tinh': 'Thị giác máy tính',
    'cong-nghe-phan-mem': 'Công nghệ phần mềm',
    'xu-ly-ngon-ngu-tu-nhien': 'Xử lý ngôn ngữ tự nhiên',
    'truyen-thong': 'Truyền thông',
    'da-phuong-tien': 'Đa phương tiện',
    'dien-tu': 'Điện tử',
    'vien-thong': 'Viễn thông',
    'xu-ly-tin-hieu': 'Xử lý tín hiệu',
    'cntt-tong-hop': 'CNTT tổng hợp',
    robot: 'Robot',
    'tu-dong-hoa': 'Tự động hóa',
    'dieu-khien': 'Điều khiển',
    'he-thong-thong-tin': 'Hệ thống thông tin',
    'chuyen-doi-so': 'Chuyển đổi số',
    'tuong-tac-nguoi-may': 'Tương tác người-máy',
    'cong-nghe-giao-duc': 'Công nghệ giáo dục',
    'dien-toan-dam-may': 'Điện toán đám mây',
    'he-thong-phan-tan': 'Hệ thống phân tán'
  };

  /**
   * Bảng từ khóa tên Topic OpenAlex ánh xạ sang từng lĩnh vực chuẩn của ConfGuide.
   */
  const TOPIC_KEYWORDS_BY_DOMAIN = {
    'tri-tue-nhan-tao': [
      'artificial intelligence', 'generative ai', 'ai agent', 'multi-agent', 'multiagent',
      'knowledge representation', 'reasoning', 'expert system', 'multimodal', 'explainable ai',
      'recommender system', 'knowledge graph', 'automated planning', 'swarm intelligence'
    ],
    'hoc-may': [
      'machine learning', 'deep learning', 'neural network', 'transformer', 'reinforcement learning',
      'federated learning', 'self-supervised', 'representation learning', 'transfer learning',
      'graph neural', 'generative adversarial', 'diffusion model', 'meta-learning', 'classification'
    ],
    'khoa-hoc-du-lieu': [
      'data science', 'data mining', 'data analytics', 'predictive modeling', 'statistical learning',
      'knowledge discovery', 'feature selection', 'anomaly detection', 'clustering', 'time series'
    ],
    'du-lieu-lon': [
      'big data', 'data pipeline', 'spark', 'hadoop', 'stream processing', 'data warehouse',
      'data lake', 'large-scale data', 'distributed data', 'mapreduce'
    ],
    'mang-may-tinh': [
      'computer network', 'wireless network', 'sensor network', 'routing protocol', 'software-defined networking',
      'software defined network', 'sdn', 'ad hoc network', 'vehicular network', 'vanet', '5g', '6g',
      'network traffic', 'packet'
    ],
    iot: [
      'internet of things', 'industrial iot', 'iiot', 'iot', 'smart home', 'smart city',
      'smart agriculture', 'edge device', 'embedded sensor', 'wearable sensor', 'mqtt'
    ],
    'an-toan-thong-tin': [
      'cybersecurity', 'cyber security', 'information security', 'network security', 'intrusion detection',
      'cryptography', 'malware', 'zero trust', 'privacy-preserving', 'privacy preserving',
      'authentication', 'vulnerability', 'phishing', 'ransomware', 'digital forensics', 'encryption'
    ],
    'thi-giac-may-tinh': [
      'computer vision', 'image segmentation', 'object detection', 'image processing',
      'vision transformer', 'pattern recognition', 'face recognition', 'medical imaging',
      'medical image', '3d reconstruction', 'optical character', 'visual tracking', 'video analysis'
    ],
    'cong-nghe-phan-mem': [
      'software engineering', 'software testing', 'fault localization', 'program analysis',
      'devops', 'microservice', 'code generation', 'source code', 'bug prediction',
      'agile software', 'requirements engineering', 'software architecture', 'refactoring'
    ],
    'xu-ly-ngon-ngu-tu-nhien': [
      'natural language processing', 'large language model', 'llm', 'question answering',
      'machine translation', 'sentiment analysis', 'text mining', 'named entity',
      'speech recognition', 'information extraction', 'text summarization', 'chatbot', 'nlp'
    ],
    'truyen-thong': [
      'communication system', 'digital communication', 'optical communication', 'wireless communication',
      'mimo', 'ofdm', 'channel estimation', 'visible light communication'
    ],
    'da-phuong-tien': [
      'multimedia', 'video coding', 'audio processing', 'speech synthesis', 'image compression',
      'virtual reality', 'augmented reality', 'content retrieval', '3d graphics'
    ],
    'dien-tu': [
      'electronics', 'vlsi', 'fpga', 'integrated circuit', 'semiconductor', 'embedded hardware',
      'cmos', 'microcontroller', 'hardware accelerator', 'printed circuit'
    ],
    'vien-thong': [
      'telecommunication', 'antenna', 'rf engineering', 'mobile communication', 'satellite communication',
      'microwave', 'radar communication', 'beamforming'
    ],
    'xu-ly-tin-hieu': [
      'signal processing', 'biomedical signal', 'electroencephalography', 'eeg', 'ecg',
      'dsp', 'speech signal', 'acoustic signal', 'wavelet', 'image denoising'
    ],
    'cntt-tong-hop': [
      'information technology', 'information and communication technology', 'computing systems',
      'applied computing', 'computer science education'
    ],
    robot: [
      'robotics', 'autonomous robot', 'mobile robot', 'robot manipulator', 'slam',
      'unmanned aerial vehicle', 'uav', 'drone', 'path planning', 'humanoid robot'
    ],
    'tu-dong-hoa': [
      'automation', 'industrial automation', 'plc', 'scada', 'smart manufacturing',
      'industry 4.0', 'robotic process automation', 'autonomous vehicle'
    ],
    'dieu-khien': [
      'control system', 'adaptive control', 'nonlinear control', 'pid control',
      'model predictive control', 'optimal control', 'fuzzy control'
    ],
    'he-thong-thong-tin': [
      'information system', 'enterprise architecture', 'erp', 'decision support',
      'management information', 'database', 'business intelligence', 'semantic web', 'ontology'
    ],
    'chuyen-doi-so': [
      'digital transformation', 'e-government', 'e government', 'digital economy',
      'smart enterprise', 'digitalization', 'fintech', 'e-commerce'
    ],
    'tuong-tac-nguoi-may': [
      'human-computer interaction', 'human computer interaction', 'user experience',
      'usability', 'hci', 'user interface', 'accessibility', 'eye tracking', 'brain-computer interface'
    ],
    'cong-nghe-giao-duc': [
      'educational technology', 'e-learning', 'e learning', 'adaptive learning',
      'edtech', 'intelligent tutoring', 'mooc', 'learning analytics', 'gamification in education'
    ],
    'dien-toan-dam-may': [
      'cloud computing', 'multi-cloud', 'cloud-native', 'serverless', 'kubernetes',
      'virtualization', 'edge-cloud', 'fog computing', 'resource scheduling', 'containerization'
    ],
    'he-thong-phan-tan': [
      'distributed system', 'distributed computing', 'parallel computing', 'high-performance computing',
      'high performance computing', 'consensus protocol', 'blockchain', 'smart contract',
      'peer-to-peer', 'fault tolerance'
    ]
  };

  /**
   * Ánh xạ các Subfield chuẩn của OpenAlex (thuộc lĩnh vực Khoa học Máy tính / Kỹ thuật)
   * sang các khóa lĩnh vực chuẩn ConfGuide khi tên topic cụ thể không khớp trực tiếp từ khóa.
   */
  const OPENALEX_SUBFIELD_MAP = {
    'artificial intelligence': ['tri-tue-nhan-tao', 'hoc-may'],
    'computer vision and pattern recognition': ['thi-giac-may-tinh'],
    'computer networks and communications': ['mang-may-tinh', 'truyen-thong'],
    software: ['cong-nghe-phan-mem'],
    'information systems': ['he-thong-thong-tin'],
    'information systems and management': ['he-thong-thong-tin', 'chuyen-doi-so'],
    'management information systems': ['he-thong-thong-tin'],
    'signal processing': ['xu-ly-tin-hieu'],
    'hardware and architecture': ['dien-tu'],
    'electrical and electronic engineering': ['dien-tu', 'vien-thong'],
    'human-computer interaction': ['tuong-tac-nguoi-may'],
    'control and systems engineering': ['dieu-khien', 'tu-dong-hoa'],
    'computer graphics and computer-aided design': ['da-phuong-tien'],
    'computer science applications': ['cntt-tong-hop'],
    'computational theory and mathematics': ['tri-tue-nhan-tao'],
    'e-learning': ['cong-nghe-giao-duc']
  };

  /* ================= 2. HÀM TIỆN ÍCH CHUẨN HÓA ================= */

  /**
   * Chuẩn hóa văn bản về chữ thường không dấu, giữ ký tự chữ/số cách nhau bằng khoảng trắng đơn.
   * @param {*} raw - Chuỗi cần chuẩn hóa.
   * @returns {string} Chuỗi chuẩn hóa ASCII.
   */
  function normalizeText(raw) {
    return String(raw || '')
      .toLowerCase()
      .replace(/[đĐ]/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /**
   * Lấy từ điển nhãn tiếng Việt chuẩn cho 25 lĩnh vực ConfGuide.
   * @returns {Object<string, string>} Bản đồ key -> label.
   */
  function getTopicLabelsMap() {
    const utils = typeof window !== 'undefined' ? window.ConfGuideUtils : null;
    if (utils && Array.isArray(utils.PREFERENCE_TOPICS) && utils.PREFERENCE_TOPICS.length > 0) {
      return utils.PREFERENCE_TOPICS.reduce((acc, item) => {
        if (item && item.key) acc[item.key] = item.label || item.key;
        return acc;
      }, {});
    }
    return FALLBACK_TOPIC_LABELS;
  }

  /**
   * Kiểm tra một cụm từ khóa có khớp ranh giới từ trong chuỗi chuẩn hóa hay không.
   * @param {string} haystack - Chuỗi nguồn đã chuẩn hóa (có khoảng trắng đầu/cuối).
   * @param {string} rawTerm - Cụm từ khóa gốc.
   * @returns {boolean} True nếu khớp.
   */
  function matchesKeywordBoundary(haystack, rawTerm) {
    const normTerm = normalizeText(rawTerm);
    if (!normTerm) return false;
    const escaped = normTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = normTerm.length <= 4
      ? new RegExp(`\\b${escaped}\\b`)
      : new RegExp(`\\b${escaped}(?:s|es)?\\b`);
    return regex.test(haystack);
  }

  /* ================= 3. ÁNH XẠ TOPICS OPENALEX & TÍNH ĐỘ TIN CẬY ================= */

  /**
   * Cộng điểm bằng chứng từ một Topic OpenAlex vào bản đồ ứng viên lĩnh vực ConfGuide.
   * @param {Map<string, Object>} candidateMap - Bản đồ gom điểm theo khóa lĩnh vực ConfGuide.
   * @param {string} domainKey - Khóa lĩnh vực chuẩn ConfGuide.
   * @param {number} scoreDelta - Điểm đóng góp từ topic hiện tại.
   * @param {string} matchedTerm - Từ khóa hoặc subfield đã khớp.
   * @param {Object} topicObj - Topic OpenAlex gốc.
   * @param {Object<string, string>} labelsMap - Bảng nhãn lĩnh vực chuẩn.
   */
  function accumulateDomainEvidence(candidateMap, domainKey, scoreDelta, matchedTerm, topicObj, labelsMap) {
    if (!Object.prototype.hasOwnProperty.call(labelsMap, domainKey) || scoreDelta <= 0) return;

    let entry = candidateMap.get(domainKey);
    if (!entry) {
      entry = {
        key: domainKey,
        label: labelsMap[domainKey],
        rawScore: 0,
        topicHits: 0,
        paperCount: 0,
        shareSum: 0,
        matchedTerms: [],
        matchedOpenAlexTopics: []
      };
      candidateMap.set(domainKey, entry);
    }

    entry.rawScore += scoreDelta;
    entry.topicHits += 1;
    entry.paperCount += Number(topicObj.count) || 0;
    entry.shareSum += Number(topicObj.share) || 0;

    if (matchedTerm && !entry.matchedTerms.includes(matchedTerm) && entry.matchedTerms.length < 4) {
      entry.matchedTerms.push(matchedTerm);
    }
    const oaName = String(topicObj.displayName || '').trim();
    if (oaName && !entry.matchedOpenAlexTopics.some(item => item.name === oaName)) {
      entry.matchedOpenAlexTopics.push({
        name: oaName,
        count: Number(topicObj.count) || 0,
        subfield: topicObj.subfield || ''
      });
    }
  }

  /**
   * Phân tích một topic OpenAlex đơn lẻ và trả về các cặp `{ key, weight, term }` khớp với ConfGuide.
   * @param {Object} topicObj - Topic đã chuẩn hóa từ `openalex.js`.
   * @param {number} index - Thứ tự ưu tiên của topic trong hồ sơ (0 là nổi bật nhất).
   * @param {number} maxTopicCount - Số bài lớn nhất ở một topic của tác giả (để chuẩn hóa tỷ trọng).
   * @returns {Array<{ key: string, score: number, term: string }>} Danh sách lĩnh vực khớp.
   */
  function matchSingleOpenAlexTopic(topicObj, index, maxTopicCount) {
    const matches = [];
    const normTitle = ` ${normalizeText(topicObj.displayName)} `;
    const normSubfield = normalizeText(topicObj.subfield);
    const normField = normalizeText(topicObj.field);

    // Trọng số theo vị trí top, số bài tương đối và topic_share của tác giả
    const rankFactor = Math.max(0.45, 1.15 - index * 0.06);
    const countRatio = maxTopicCount > 0 ? Math.min(1, (Number(topicObj.count) || 0) / maxTopicCount) : 0.4;
    const shareBoost = Number.isFinite(topicObj.share) ? Math.min(0.6, topicObj.share * 1.8) : 0;
    const volumeFactor = 0.7 + countRatio * 0.5 + shareBoost;

    let hasDirectKeywordMatch = false;

    Object.entries(TOPIC_KEYWORDS_BY_DOMAIN).forEach(([domainKey, terms]) => {
      const matchedTermsForDomain = [];
      for (let i = 0; i < terms.length; i++) {
        if (matchesKeywordBoundary(normTitle, terms[i])) {
          matchedTermsForDomain.push(terms[i]);
        }
      }
      if (matchedTermsForDomain.length > 0) {
        hasDirectKeywordMatch = true;
        const multiTermBoost = Math.min(0.8, (matchedTermsForDomain.length - 1) * 0.35);
        const score = (2.6 + multiTermBoost) * rankFactor * volumeFactor;
        matches.push({
          key: domainKey,
          score,
          term: matchedTermsForDomain[0]
        });
      }
    });

    // Nếu tên topic không khớp trực tiếp từ khóa, đối chiếu qua subfield chuẩn của OpenAlex
    if (!hasDirectKeywordMatch && normSubfield && Object.prototype.hasOwnProperty.call(OPENALEX_SUBFIELD_MAP, normSubfield)) {
      const isItField = normField.includes('computer science')
        || normField.includes('engineering')
        || normField.includes('decision sciences');
      const subfieldBaseWeight = isItField ? 1.55 : 0.9;
      OPENALEX_SUBFIELD_MAP[normSubfield].forEach((domainKey, subIdx) => {
        const secondaryPenalty = subIdx === 0 ? 1 : 0.75;
        matches.push({
          key: domainKey,
          score: subfieldBaseWeight * secondaryPenalty * rankFactor * volumeFactor,
          term: topicObj.subfield
        });
      });
    }

    return matches;
  }

  /**
   * Quy đổi điểm thô của từng lĩnh vực ứng viên sang phần trăm độ tin cậy (`0..96%`).
   * @param {Object} entry - Bản ghi tích lũy của một lĩnh vực ConfGuide.
   * @returns {number} Độ tin cậy phần trăm nguyên (`0..96`).
   */
  function computeDomainConfidencePercent(entry) {
    const basePart = Math.min(entry.rawScore, 4.2) * 11.2;
    const extraPart = Math.max(0, entry.rawScore - 4.2) * 3.1;
    const hitBonus = entry.topicHits >= 2 ? Math.min(6, (entry.topicHits - 1) * 2.5) : 0;
    return Math.min(96, Math.round(32 + basePart + extraPart + hitBonus));
  }

  /**
   * Ánh xạ toàn bộ hồ sơ tác giả OpenAlex sang danh mục 25 lĩnh vực ConfGuide,
   * tính độ tin cậy từng lĩnh vực và quyết định xem có đủ ngưỡng xác nhận tự động hay không.
   * @param {Object|null} authorSummary - Hồ sơ tác giả chuẩn hóa từ `ConfGuideOpenAlex.extractAuthorSummary`.
   * @param {{ threshold?: number, maxRecommendations?: number }} [options={}] - Tùy chọn ngưỡng & số lượng tối đa.
   * @returns {{
   *   recognized: boolean,
   *   threshold: number,
   *   overallConfidence: number,
   *   authorId: string,
   *   authorName: string,
   *   orcid: string,
   *   worksCount: number,
   *   sourcesUsed: Array<string>,
   *   recommendedTopics: Array<Object>,
   *   allCandidates: Array<Object>,
   *   fallbackReason: string
   * }} Kết quả ánh xạ và độ tin cậy.
   */
  function mapOpenAlexAuthorToDomains(authorSummary, options = {}) {
    const threshold = Number.isFinite(options.threshold) ? options.threshold : DEFAULT_CONFIDENCE_THRESHOLD;
    const maxRecs = Number.isFinite(options.maxRecommendations) ? options.maxRecommendations : 6;
    const labelsMap = getTopicLabelsMap();

    if (!authorSummary || typeof authorSummary !== 'object') {
      return {
        recognized: false,
        threshold,
        overallConfidence: 0,
        authorId: '',
        authorName: '',
        orcid: '',
        worksCount: 0,
        sourcesUsed: ['Google Profile'],
        recommendedTopics: [],
        allCandidates: [],
        fallbackReason: 'no-author'
      };
    }

    const sourcesUsed = ['Google Profile', 'OpenAlex'];
    if (authorSummary.orcid) sourcesUsed.push('ORCID');

    const topics = Array.isArray(authorSummary.topics) ? authorSummary.topics : [];
    if (topics.length === 0) {
      return {
        recognized: false,
        threshold,
        overallConfidence: 0,
        authorId: authorSummary.shortId || authorSummary.id || '',
        authorName: authorSummary.displayName || '',
        orcid: authorSummary.orcid || '',
        worksCount: Number(authorSummary.worksCount) || 0,
        sourcesUsed,
        recommendedTopics: [],
        allCandidates: [],
        fallbackReason: 'insufficient-data'
      };
    }

    const maxTopicCount = topics.reduce((maxVal, item) => Math.max(maxVal, Number(item.count) || 0), 0);
    const candidateMap = new Map();

    topics.slice(0, 15).forEach((topicObj, idx) => {
      const matchedPairs = matchSingleOpenAlexTopic(topicObj, idx, maxTopicCount);
      matchedPairs.forEach(pair => {
        accumulateDomainEvidence(candidateMap, pair.key, pair.score, pair.term, topicObj, labelsMap);
      });
    });

    const allCandidates = Array.from(candidateMap.values())
      .map(entry => ({
        key: entry.key,
        label: entry.label,
        confidence: computeDomainConfidencePercent(entry),
        matchedTerms: entry.matchedTerms,
        matchedOpenAlexTopics: entry.matchedOpenAlexTopics.slice(0, 3),
        paperCount: entry.paperCount
      }))
      .sort((a, b) => b.confidence - a.confidence || a.label.localeCompare(b.label, 'vi'));

    const recommendedTopics = allCandidates.filter(item => item.confidence >= threshold).slice(0, maxRecs);
    const overallConfidence = recommendedTopics.length > 0
      ? Math.round(recommendedTopics.reduce((sum, item) => sum + item.confidence, 0) / recommendedTopics.length)
      : (allCandidates[0] ? allCandidates[0].confidence : 0);

    const recognized = recommendedTopics.length > 0 && overallConfidence >= threshold;
    let fallbackReason = '';
    if (!recognized) {
      fallbackReason = allCandidates.length > 0 ? 'low-confidence' : 'no-matching-it-topics';
    }

    return {
      recognized,
      threshold,
      overallConfidence,
      authorId: authorSummary.shortId || authorSummary.id || '',
      authorName: authorSummary.displayName || '',
      orcid: authorSummary.orcid || '',
      worksCount: Number(authorSummary.worksCount) || 0,
      sourcesUsed,
      recommendedTopics,
      allCandidates: allCandidates.slice(0, maxRecs),
      fallbackReason
    };
  }

  window.ConfGuideDomainMapper = {
    DEFAULT_CONFIDENCE_THRESHOLD,
    TOPIC_KEYWORDS_BY_DOMAIN,
    OPENALEX_SUBFIELD_MAP,
    normalizeText,
    mapOpenAlexAuthorToDomains
  };
})();
