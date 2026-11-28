/**
 * Bộ phân tích mô tả nhu cầu người dùng thành bộ lọc tìm kiếm (js/components/intent-parser.js)
 * VD: "tôi muốn nghiên cứu trí tuệ nhân tạo, hội nghị rank B trở lên, tổ chức tại Việt Nam"
 *  => { topics: ['ai'], ranks: ['A*','A','B'], scopes: ['vietnam'], ... }
 */
(function () {
  'use strict';

  /** Bỏ dấu tiếng Việt + chữ thường + gom khoảng trắng */
  function normalize(text) {
    return String(text || '')
      .replace(/[đĐ]/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9*+\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Từ khóa (đã bỏ dấu) -> khóa lĩnh vực trong data/conference_data.json (trường `topics`) */
  const TOPIC_KEYWORDS = {
    ai: ['tri tue nhan tao', 'artificial intelligence', 'ai', 'hoc may', 'machine learning', 'ml',
      'hoc sau', 'deep learning', 'dl', 'generative', 'llm', 'mang no ron', 'neural'],
    data: ['khoa hoc du lieu', 'data science', 'du lieu lon', 'big data', 'khai pha du lieu', 'data mining', 'du lieu'],
    vision: ['thi giac may tinh', 'computer vision', 'xu ly anh', 'image processing', 'da phuong tien', 'multimedia'],
    nlp: ['xu ly ngon ngu tu nhien', 'ngon ngu tu nhien', 'natural language', 'nlp'],
    security: ['an toan thong tin', 'an ninh mang', 'bao mat', 'security', 'cyber', 'privacy'],
    network: ['mang may tinh', 'network', 'iot', 'internet of things', 'truyen thong', 'wireless', 'vien thong'],
    software: ['cong nghe phan mem', 'ky thuat phan mem', 'software', 'phan mem'],
    cloud: ['dien toan dam may', 'cloud', 'phan tan', 'distributed'],
    robotics: ['robot', 'robotics', 'tu dong hoa', 'dieu khien'],
    hci: ['tuong tac nguoi may', 'hci', 'human computer'],
    theory: ['ly thuyet', 'theory', 'thuat toan', 'algorithm'],
    infosys: ['he thong thong tin', 'information system'],
    electronics: ['dien tu', 'electronics', 'nhung', 'embedded'],
    health: ['y te', 'suc khoe', 'health', 'medical']
  };

  const RANK_ORDER = ['A*', 'A', 'B', 'C'];

  /** Đọc phân hạng: "rank B trở lên", "từ hạng A", "A*", "uy tín" */
  function parseRanks(norm) {
    const m = norm.match(/(?:rank|hang|core)\s*(a\*|a\s*sao|a|b|c)(?![a-z0-9])(.{0,20})/);
    if (m) {
      const code = m[1].replace(/\s*sao/, '*').toUpperCase();
      const idx = RANK_ORDER.indexOf(code);
      const tail = m[2] || '';
      const orHigher = /tro len|tro di|hoac cao hon|tren/.test(tail) || /tu\s*(rank|hang)/.test(norm);
      if (idx >= 0) return orHigher ? RANK_ORDER.slice(0, idx + 1) : [code];
    }
    if (/\buy tin\b|top tier|hang dau/.test(norm)) return ['A*', 'A'];
    return [];
  }

  function parseScopes(norm) {
    const vn = /(tai|o|trong)\s*(nuoc|viet nam|vn)\b|viet nam|vietnam|trong nuoc/.test(norm);
    const intl = /quoc te|nuoc ngoai|international/.test(norm);
    if (vn && !intl) return ['vietnam'];
    if (intl && !vn) return ['international'];
    return [];
  }

  function parseCity(norm) {
    if (/\bha noi\b|\bhanoi\b/.test(norm)) return 'ha-noi';
    if (/ho chi minh|\bhcm\b|sai gon|saigon/.test(norm)) return 'ho-chi-minh';
    return 'all';
  }

  function parseModes(norm) {
    const modes = [];
    if (/truc tuyen|online|tu xa/.test(norm)) modes.push('online');
    if (/truc tiep|offline|tai cho/.test(norm)) modes.push('offline');
    if (/ket hop|hybrid/.test(norm)) modes.push('hybrid');
    return modes;
  }

  function parseTopics(norm) {
    const padded = ` ${norm} `;
    const found = [];
    Object.keys(TOPIC_KEYWORDS).forEach(key => {
      const hit = TOPIC_KEYWORDS[key].some(kw => padded.includes(` ${kw} `));
      if (hit) found.push(key);
    });
    return found;
  }

  /**
   * Phân tích mô tả thành bộ lọc.
   * @param {string} text Mô tả người dùng nhập.
   * @returns {{topics:string[], ranks:string[], scopes:string[], city:string, modes:string[]}}
   */
  function parse(text) {
    const norm = normalize(text);
    const city = parseCity(norm);
    let scopes = parseScopes(norm);
    if (city !== 'all' && scopes.length === 0) scopes = ['vietnam'];
    return {
      topics: parseTopics(norm),
      ranks: parseRanks(norm),
      scopes,
      city,
      modes: parseModes(norm)
    };
  }

  window.ConfGuideIntent = { parse, normalize };
})();