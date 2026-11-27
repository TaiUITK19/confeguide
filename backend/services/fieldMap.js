/**
 * Dịch vụ ánh xạ lĩnh vực nghiên cứu (backend/services/fieldMap.js)
 * Đối chiếu danh sách research interests từ Google Scholar (hoặc topics/field từ OpenAlex)
 * với 25 lĩnh vực chuẩn trong hệ thống ConfGuide (lấy từ PREFERENCE_TOPICS trong js/core/layout.js).
 */

'use strict';

/**
 * Danh sách 25 lĩnh vực chuẩn trong hệ thống ConfGuide.
 * Khớp 1:1 với PREFERENCE_TOPICS ở frontend (js/core/layout.js).
 */
const SYSTEM_FIELDS = [
  { key: 'tri-tue-nhan-tao', label: 'Trí tuệ nhân tạo', primary: true },
  { key: 'hoc-may', label: 'Học máy', primary: true },
  { key: 'khoa-hoc-du-lieu', label: 'Khoa học dữ liệu', primary: true },
  { key: 'du-lieu-lon', label: 'Dữ liệu lớn', primary: true },
  { key: 'mang-may-tinh', label: 'Mạng máy tính', primary: true },
  { key: 'iot', label: 'IoT', primary: true },
  { key: 'an-toan-thong-tin', label: 'An toàn thông tin', primary: true },
  { key: 'thi-giac-may-tinh', label: 'Thị giác máy tính', primary: true },
  { key: 'cong-nghe-phan-mem', label: 'Công nghệ phần mềm', primary: true },
  { key: 'xu-ly-ngon-ngu-tu-nhien', label: 'Xử lý ngôn ngữ tự nhiên', primary: true },
  { key: 'truyen-thong', label: 'Truyền thông', primary: false },
  { key: 'da-phuong-tien', label: 'Đa phương tiện', primary: false },
  { key: 'dien-tu', label: 'Điện tử', primary: false },
  { key: 'vien-thong', label: 'Viễn thông', primary: false },
  { key: 'xu-ly-tin-hieu', label: 'Xử lý tín hiệu', primary: false },
  { key: 'cntt-tong-hop', label: 'CNTT tổng hợp', primary: false },
  { key: 'robot', label: 'Robot', primary: false },
  { key: 'tu-dong-hoa', label: 'Tự động hóa', primary: false },
  { key: 'dieu-khien', label: 'Điều khiển', primary: false },
  { key: 'he-thong-thong-tin', label: 'Hệ thống thông tin', primary: false },
  { key: 'chuyen-doi-so', label: 'Chuyển đổi số', primary: false },
  { key: 'tuong-tac-nguoi-may', label: 'Tương tác người-máy', primary: false },
  { key: 'cong-nghe-giao-duc', label: 'Công nghệ giáo dục', primary: false },
  { key: 'dien-toan-dam-may', label: 'Điện toán đám mây', primary: false },
  { key: 'he-thong-phan-tan', label: 'Hệ thống phân tán', primary: false }
];

const VALID_FIELD_KEYS = new Set(SYSTEM_FIELDS.map(item => item.key));
const FIELD_LABEL_BY_KEY = SYSTEM_FIELDS.reduce((acc, item) => {
  acc[item.key] = item.label;
  return acc;
}, {});

/**
 * Bảng từ đồng nghĩa (tiếng Anh, viết tắt phổ biến trên Scholar và tiếng Việt không dấu)
 * ánh xạ sang 25 khóa lĩnh vực chuẩn của ConfGuide.
 */
const FIELD_SYNONYMS = {
  'tri-tue-nhan-tao': [
    'tri tue nhan tao', 'artificial intelligence', 'ai', 'generative ai', 'genai',
    'ai agent', 'multi-agent', 'multiagent', 'knowledge representation', 'reasoning',
    'expert system', 'multimodal ai', 'explainable ai', 'xai', 'recommender system',
    'recommendation system', 'knowledge graph', 'automated planning', 'swarm intelligence',
    'ai foundations', 'computational intelligence', 'healthcare ai'
  ],
  'hoc-may': [
    'hoc may', 'hoc sau', 'machine learning', 'ml', 'deep learning', 'dl',
    'neural network', 'neural networks', 'transformer', 'reinforcement learning',
    'federated learning', 'self-supervised learning', 'self-supervised',
    'representation learning', 'transfer learning', 'graph neural network', 'gnn',
    'generative adversarial network', 'gan', 'diffusion model', 'meta-learning',
    'statistical machine learning', 'pattern classification'
  ],
  'khoa-hoc-du-lieu': [
    'khoa hoc du lieu', 'phan tich du lieu', 'khai pha du lieu', 'data science',
    'data mining', 'data analytics', 'big data analytics', 'predictive modeling',
    'statistical learning', 'knowledge discovery', 'feature selection',
    'anomaly detection', 'time series analysis', 'data engineering'
  ],
  'du-lieu-lon': [
    'du lieu lon', 'big data', 'data pipeline', 'spark', 'apache spark', 'hadoop',
    'stream processing', 'data warehouse', 'data lake', 'large-scale data',
    'distributed data', 'mapreduce'
  ],
  'mang-may-tinh': [
    'mang may tinh', 'mang khong day', 'computer network', 'computer networks',
    'networking', 'wireless network', 'wireless networks', 'sensor network',
    'wireless sensor network', 'wsn', 'routing protocol', 'software-defined networking',
    'software defined network', 'sdn', 'ad hoc network', 'vehicular network',
    'vanet', '5g', '6g', 'network traffic', 'mobile network'
  ],
  iot: [
    'iot', 'internet of things', 'industrial iot', 'iiot', 'van vat ket noi',
    'smart home', 'smart city', 'smart agriculture', 'edge device', 'embedded sensor',
    'wearable sensor', 'mqtt', 'aiot'
  ],
  'an-toan-thong-tin': [
    'an toan thong tin', 'an ninh mang', 'bao mat', 'cybersecurity', 'cyber security',
    'information security', 'network security', 'computer security', 'security',
    'privacy', 'intrusion detection', 'cryptography', 'applied cryptography',
    'malware analysis', 'malware', 'zero trust', 'privacy-preserving',
    'privacy preserving', 'authentication', 'vulnerability', 'digital forensics',
    'encryption', 'system security', 'web security'
  ],
  'thi-giac-may-tinh': [
    'thi giac may tinh', 'xu ly anh', 'computer vision', 'cv', 'image segmentation',
    'object detection', 'image processing', 'vision transformer', 'pattern recognition',
    'face recognition', 'medical imaging', 'medical image', '3d reconstruction',
    'optical character recognition', 'ocr', 'visual tracking', 'video analysis',
    'scene understanding', 'image understanding'
  ],
  'cong-nghe-phan-mem': [
    'cong nghe phan mem', 'ky thuat phan mem', 'kiem thu phan mem',
    'software engineering', 'se', 'software testing', 'fault localization',
    'program analysis', 'devops', 'microservice', 'microservices', 'code generation',
    'source code analysis', 'bug prediction', 'agile software',
    'requirements engineering', 'software architecture', 'refactoring', 'software maintenance'
  ],
  'xu-ly-ngon-ngu-tu-nhien': [
    'xu ly ngon ngu tu nhien', 'natural language processing', 'nlp',
    'computational linguistics', 'large language model', 'large language models',
    'llm', 'llms', 'question answering', 'machine translation', 'sentiment analysis',
    'text mining', 'named entity recognition', 'speech recognition',
    'information extraction', 'text summarization', 'chatbot', 'language model'
  ],
  'truyen-thong': [
    'truyen thong', 'truyen thong so', 'communication system', 'communication systems',
    'communications', 'digital communication', 'optical communication',
    'wireless communication', 'wireless communications', 'mimo', 'ofdm',
    'channel estimation', 'visible light communication'
  ],
  'da-phuong-tien': [
    'da phuong tien', 'multimedia', 'multimedia computing', 'video coding',
    'audio processing', 'speech synthesis', 'image compression', 'virtual reality',
    'augmented reality', 'vr', 'ar', 'content retrieval', '3d graphics',
    'computer graphics'
  ],
  'dien-tu': [
    'dien tu', 'vi mach', 'electronics', 'vlsi', 'fpga', 'integrated circuit',
    'semiconductor', 'embedded hardware', 'embedded system', 'embedded systems',
    'cmos', 'microcontroller', 'hardware accelerator', 'printed circuit',
    'computer architecture'
  ],
  'vien-thong': [
    'vien thong', 'telecommunication', 'telecommunications', 'antenna',
    'rf engineering', 'mobile communication', 'satellite communication',
    'microwave', 'radar communication', 'beamforming'
  ],
  'xu-ly-tin-hieu': [
    'xu ly tin hieu', 'signal processing', 'digital signal processing', 'dsp',
    'biomedical signal', 'electroencephalography', 'eeg', 'ecg', 'speech signal',
    'acoustic signal', 'wavelet', 'image denoising', 'statistical signal processing'
  ],
  'cntt-tong-hop': [
    'cntt tong hop', 'cong nghe thong tin', 'khoa hoc may tinh',
    'information technology', 'information and communication technology', 'ict',
    'computing systems', 'applied computing', 'computer science', 'computer science education'
  ],
  robot: [
    'robot', 'nguoi may', 'robotics', 'autonomous robot', 'mobile robot',
    'robot manipulator', 'slam', 'unmanned aerial vehicle', 'uav', 'drone',
    'path planning', 'humanoid robot', 'autonomous systems'
  ],
  'tu-dong-hoa': [
    'tu dong hoa', 'automation', 'industrial automation', 'plc', 'scada',
    'smart manufacturing', 'industry 4.0', 'robotic process automation',
    'autonomous vehicle', 'autonomous driving'
  ],
  'dieu-khien': [
    'dieu khien', 'dieu khien tu dong', 'control system', 'control systems',
    'control theory', 'adaptive control', 'nonlinear control', 'pid control',
    'model predictive control', 'optimal control', 'fuzzy control'
  ],
  'he-thong-thong-tin': [
    'he thong thong tin', 'co so du lieu', 'information system', 'information systems',
    'enterprise architecture', 'erp', 'decision support', 'management information',
    'database', 'databases', 'database systems', 'business intelligence',
    'semantic web', 'ontology', 'knowledge engineering', 'information retrieval'
  ],
  'chuyen-doi-so': [
    'chuyen doi so', 'digital transformation', 'e-government', 'e government',
    'digital economy', 'smart enterprise', 'digitalization', 'fintech', 'e-commerce'
  ],
  'tuong-tac-nguoi-may': [
    'tuong tac nguoi may', 'human-computer interaction', 'human computer interaction',
    'hci', 'user experience', 'ux', 'user interface', 'ui', 'usability',
    'accessibility', 'eye tracking', 'brain-computer interface', 'bci'
  ],
  'cong-nghe-giao-duc': [
    'cong nghe giao duc', 'educational technology', 'e-learning', 'e learning',
    'adaptive learning', 'edtech', 'intelligent tutoring', 'mooc',
    'learning analytics', 'gamification in education'
  ],
  'dien-toan-dam-may': [
    'dien toan dam may', 'cloud computing', 'cloud', 'multi-cloud', 'cloud-native',
    'serverless', 'kubernetes', 'virtualization', 'edge computing', 'edge-cloud',
    'fog computing', 'resource scheduling', 'containerization'
  ],
  'he-thong-phan-tan': [
    'he thong phan tan', 'tinh toan song song', 'distributed system',
    'distributed systems', 'distributed computing', 'parallel computing',
    'high-performance computing', 'high performance computing', 'hpc',
    'consensus protocol', 'blockchain', 'smart contract', 'peer-to-peer',
    'fault tolerance', 'fault-tolerant computing'
  ]
};

/**
 * Bảng dự phòng cho Subfield/Field chuẩn của OpenAlex khi tên topic chi tiết chưa khớp từ đồng nghĩa.
 */
const OPENALEX_SUBFIELD_SYNONYMS = {
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

/**
 * Chuẩn hóa chuỗi về chữ thường ASCII không dấu để so khớp ổn định.
 * @param {*} raw - Chuỗi đầu vào.
 * @returns {string} Chuỗi chuẩn hóa.
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
 * Tạo slug kebab-case từ chuỗi bất kỳ.
 * @param {*} raw - Chuỗi đầu vào.
 * @returns {string} Slug ASCII.
 */
function toSlug(raw) {
  return normalizeText(raw).replace(/\s+/g, '-');
}

/**
 * Dựng chỉ mục tra cứu nhanh cho so khớp chính xác theo từ khóa / nhãn chuẩn / key.
 */
const EXACT_SYNONYM_INDEX = new Map();
for (const field of SYSTEM_FIELDS) {
  const keysToIndex = new Set([
    normalizeText(field.key.replace(/-/g, ' ')),
    normalizeText(field.label),
    ...(FIELD_SYNONYMS[field.key] || []).map(normalizeText)
  ]);
  for (const term of keysToIndex) {
    if (!term) continue;
    if (!EXACT_SYNONYM_INDEX.has(term)) {
      EXACT_SYNONYM_INDEX.set(term, new Set());
    }
    EXACT_SYNONYM_INDEX.get(term).add(field.key);
  }
}

/**
 * Biên dịch sẵn biểu thức ranh giới từ cho từng từ đồng nghĩa để so khớp cụm từ trong chuỗi dài.
 */
const COMPILED_SYNONYM_PATTERNS = Object.entries(FIELD_SYNONYMS).map(([fieldKey, terms]) => {
  const uniqueNormTerms = [...new Set(terms.map(normalizeText).filter(Boolean))];
  const patterns = uniqueNormTerms.map(normTerm => {
    const escaped = normTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Từ viết tắt <= 3 ký tự tránh khớp số nhiều dễ nhầm; cụm dài hơn cho phép dạng số nhiều s/es
    const regex = normTerm.length <= 3
      ? new RegExp(`\\b${escaped}\\b`)
      : new RegExp(`\\b${escaped}(?:s|es)?\\b`);
    return { normTerm, regex };
  });
  return { fieldKey, patterns };
});

/**
 * Kiểm tra một giá trị key hoặc tên lĩnh vực có tương ứng với một trong 25 lĩnh vực chuẩn hay không.
 * @param {string} keyOrLabel - Key slug hoặc tên lĩnh vực.
 * @returns {{ key: string, label: string } | null} Lĩnh vực chuẩn hoặc null nếu không khớp.
 */
function resolveSystemField(keyOrLabel) {
  const raw = String(keyOrLabel || '').trim();
  if (!raw) return null;

  const slugCandidate = toSlug(raw);
  if (VALID_FIELD_KEYS.has(slugCandidate)) {
    return { key: slugCandidate, label: FIELD_LABEL_BY_KEY[slugCandidate] };
  }

  const norm = normalizeText(raw);
  if (norm && EXACT_SYNONYM_INDEX.has(norm)) {
    const firstKey = [...EXACT_SYNONYM_INDEX.get(norm)][0];
    return { key: firstKey, label: FIELD_LABEL_BY_KEY[firstKey] };
  }

  return null;
}

/**
 * Đối chiếu một interest đơn lẻ (chuỗi từ Scholar hoặc object topic từ OpenAlex)
 * sang danh sách các khóa lĩnh vực chuẩn trong hệ thống.
 * @param {string|{ displayName?: string, name?: string, subfield?: string, field?: string }} item
 * @returns {{ originalText: string, hits: Array<{ key: string, matchedVia: string }> }}
 */
function matchSingleInterest(item) {
  const isObj = item && typeof item === 'object';
  const originalText = String(isObj ? (item.displayName || item.name || '') : item || '').trim();
  if (!originalText) {
    return { originalText: '', hits: [] };
  }

  const normText = normalizeText(originalText);
  const hits = [];
  const seenKeys = new Set();

  const addHit = (key, matchedVia) => {
    if (!VALID_FIELD_KEYS.has(key) || seenKeys.has(key)) return;
    seenKeys.add(key);
    hits.push({ key, matchedVia });
  };

  // 1. Ưu tiên khớp chính xác (không phân biệt hoa thường/dấu) theo bảng đồng nghĩa & nhãn chuẩn
  if (normText && EXACT_SYNONYM_INDEX.has(normText)) {
    for (const key of EXACT_SYNONYM_INDEX.get(normText)) {
      addHit(key, originalText);
    }
  }

  // 2. Nếu chưa khớp trọn chuỗi, tách theo dấu nối (, / & ;) hoặc quét cụm từ đồng nghĩa trong chuỗi
  if (hits.length === 0 && normText) {
    const padded = ` ${normText} `;
    for (const { fieldKey, patterns } of COMPILED_SYNONYM_PATTERNS) {
      for (const { normTerm, regex } of patterns) {
        if (regex.test(padded)) {
          addHit(fieldKey, normTerm);
          break;
        }
      }
    }
  }

  // 3. Nếu là dữ liệu từ OpenAlex có thêm subfield / field, kiểm tra bổ sung
  if (hits.length === 0 && isObj) {
    const normSubfield = normalizeText(item.subfield);
    const normField = normalizeText(item.field);

    if (normSubfield && Object.prototype.hasOwnProperty.call(OPENALEX_SUBFIELD_SYNONYMS, normSubfield)) {
      for (const key of OPENALEX_SUBFIELD_SYNONYMS[normSubfield]) {
        addHit(key, item.subfield);
      }
    } else if (normField && EXACT_SYNONYM_INDEX.has(normField)) {
      for (const key of EXACT_SYNONYM_INDEX.get(normField)) {
        addHit(key, item.field);
      }
    }
  }

  return { originalText, hits };
}

/**
 * Đối chiếu danh sách research interests (từ Google Scholar hoặc OpenAlex) với
 * 25 lĩnh vực có sẵn trong hệ thống ConfGuide.
 * @param {Array<string|Object>} interests - Danh sách interests hoặc OpenAlex topics.
 * @returns {{
 *   matched: Array<{ key: string, label: string, matchedInterests: Array<string>, matchedTerms: Array<string> }>,
 *   unmatched: Array<string>
 * }} Kết quả gồm 2 mảng matched và unmatched.
 */
function mapResearchInterests(interests) {
  const list = Array.isArray(interests) ? interests : [];
  const matchedByKey = new Map();
  const unmatched = [];
  const seenUnmatched = new Set();

  for (const rawItem of list) {
    const { originalText, hits } = matchSingleInterest(rawItem);
    if (!originalText) continue;

    if (hits.length === 0) {
      const low = originalText.toLowerCase();
      if (!seenUnmatched.has(low)) {
        seenUnmatched.add(low);
        unmatched.push(originalText);
      }
      continue;
    }

    for (const { key, matchedVia } of hits) {
      let entry = matchedByKey.get(key);
      if (!entry) {
        entry = {
          key,
          label: FIELD_LABEL_BY_KEY[key] || key,
          matchedInterests: [],
          matchedTerms: []
        };
        matchedByKey.set(key, entry);
      }
      if (!entry.matchedInterests.includes(originalText)) {
        entry.matchedInterests.push(originalText);
      }
      if (matchedVia && !entry.matchedTerms.includes(matchedVia)) {
        entry.matchedTerms.push(matchedVia);
      }
    }
  }

  return {
    matched: Array.from(matchedByKey.values()),
    unmatched
  };
}

/**
 * Các từ viết tắt CNTT đặc trưng được nhận diện trong văn bản tự do (tiểu sử, tiêu đề bài báo)
 * chỉ khi viết hoa đúng dạng viết tắt nhằm tránh nhầm chữ thường tiếng Việt/Anh (VD: "sẽ", "ai", "are").
 */
const UPPERCASE_PROSE_ACRONYMS = [
  { regex: /\b(?:AI|XAI|GenAI)\b/, key: 'tri-tue-nhan-tao', term: 'AI' },
  { regex: /\b(?:ML|DL|GNN)\b/, key: 'hoc-may', term: 'ML/DL' },
  { regex: /\b(?:IoT|IIoT|AIoT)\b/, key: 'iot', term: 'IoT' },
  { regex: /\b(?:NLP|LLMs?)\b/, key: 'xu-ly-ngon-ngu-tu-nhien', term: 'NLP/LLM' },
  { regex: /\b(?:WSN|SDN|5G|6G)\b/, key: 'mang-may-tinh', term: 'WSN/SDN/5G/6G' },
  { regex: /\b(?:VLSI|FPGA|CMOS)\b/, key: 'dien-tu', term: 'VLSI/FPGA' },
  { regex: /\b(?:DSP|EEG|ECG)\b/, key: 'xu-ly-tin-hieu', term: 'DSP/EEG/ECG' },
  { regex: /\b(?:UAV|SLAM)\b/, key: 'robot', term: 'UAV/SLAM' },
  { regex: /\b(?:HCI|BCI)\b/, key: 'tuong-tac-nguoi-may', term: 'HCI/BCI' },
  { regex: /\b(?:HPC)\b/, key: 'he-thong-phan-tan', term: 'HPC' },
  { regex: /\b(?:ICT)\b/, key: 'cntt-tong-hop', term: 'ICT' },
  { regex: /\b(?:OCR)\b/, key: 'thi-giac-may-tinh', term: 'OCR' }
];

/** Một số từ đơn quá ngắn hoặc dễ nhầm ngữ cảnh khi quét câu văn dài (như "point cloud" != cloud computing) */
const PROSE_AMBIGUOUS_SINGLE_WORDS = new Set(['cloud', 'security', 'privacy', 'antenna', 'wavelet']);

/**
 * Quét cụm từ chuyên ngành CNTT từ một đoạn văn bản dài (tiểu sử tác giả, cơ quan, tiêu đề bài báo).
 * @param {string} rawText - Văn bản nguồn chưa tách danh sách.
 * @returns {Array<{ key: string, matchedVia: string }>} Danh sách khóa lĩnh vực tìm được.
 */
function extractFromFreeText(rawText) {
  const original = String(rawText || '').trim();
  if (!original) return [];

  const normText = normalizeText(original);
  const padded = normText ? ` ${normText} ` : '';
  const hits = [];
  const seenKeys = new Set();

  const pushHit = (key, matchedVia) => {
    if (!VALID_FIELD_KEYS.has(key) || seenKeys.has(key)) return;
    seenKeys.add(key);
    hits.push({ key, matchedVia });
  };

  if (padded) {
    for (const { fieldKey, patterns } of COMPILED_SYNONYM_PATTERNS) {
      for (const { normTerm, regex } of patterns) {
        const isPhrase = normTerm.includes(' ');
        const isSafeLongSingleWord = normTerm.length >= 6 && !PROSE_AMBIGUOUS_SINGLE_WORDS.has(normTerm);
        if (!isPhrase && !isSafeLongSingleWord) continue;
        if (regex.test(padded)) {
          pushHit(fieldKey, normTerm);
          break;
        }
      }
    }
  }

  for (const rule of UPPERCASE_PROSE_ACRONYMS) {
    if (rule.regex.test(original)) {
      pushHit(rule.key, rule.term);
    }
  }

  return hits;
}

/**
 * Hợp nhất nhiều nguồn tín hiệu công khai của tác giả (lĩnh vực công khai, tiểu sử, cơ quan, tiêu đề bài báo)
 * và đối chiếu với 25 lĩnh vực chuẩn trong hệ thống ConfGuide.
 * @param {{
 *   interests?: Array<string|Object>,
 *   biography?: string,
 *   affiliation?: string,
 *   paperTitles?: Array<string>
 * }} [signals={}]
 * @returns {{
 *   matched: Array<{ key: string, label: string, matchedInterests: Array<string>, matchedTerms: Array<string>, matchedFrom: Array<string> }>,
 *   unmatched: Array<string>
 * }}
 */
function extractFieldsFromProfileSignals(signals = {}) {
  const base = mapResearchInterests(Array.isArray(signals.interests) ? signals.interests : []);
  const matchedByKey = new Map();

  for (const entry of base.matched) {
    matchedByKey.set(entry.key, {
      ...entry,
      matchedFrom: ['interests']
    });
  }

  const mergeSignalText = (text, originTag, displaySnippet) => {
    const clean = String(text || '').trim();
    if (!clean) return;
    const hits = extractFromFreeText(clean);
    for (const { key, matchedVia } of hits) {
      let entry = matchedByKey.get(key);
      if (!entry) {
        entry = {
          key,
          label: FIELD_LABEL_BY_KEY[key] || key,
          matchedInterests: [],
          matchedTerms: [],
          matchedFrom: []
        };
        matchedByKey.set(key, entry);
      }
      const preview = String(displaySnippet || clean).slice(0, 120);
      if (preview && !entry.matchedInterests.includes(preview)) {
        entry.matchedInterests.push(preview);
      }
      if (matchedVia && !entry.matchedTerms.includes(matchedVia)) {
        entry.matchedTerms.push(matchedVia);
      }
      if (!entry.matchedFrom.includes(originTag)) {
        entry.matchedFrom.push(originTag);
      }
    }
  };

  if (signals.biography) {
    mergeSignalText(signals.biography, 'biography', 'Tiểu sử hồ sơ');
  }
  if (signals.affiliation) {
    mergeSignalText(signals.affiliation, 'affiliation', signals.affiliation);
  }
  if (Array.isArray(signals.paperTitles)) {
    for (const title of signals.paperTitles.slice(0, 20)) {
      mergeSignalText(title, 'papers', title);
    }
  }

  return {
    matched: Array.from(matchedByKey.values()),
    unmatched: base.unmatched
  };
}

module.exports = {
  SYSTEM_FIELDS,
  VALID_FIELD_KEYS,
  FIELD_LABEL_BY_KEY,
  FIELD_SYNONYMS,
  normalizeText,
  toSlug,
  resolveSystemField,
  mapResearchInterests,
  extractFromFreeText,
  extractFieldsFromProfileSignals
};
