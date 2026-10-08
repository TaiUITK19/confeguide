/**
 * ConfGuide – Dữ liệu Hội nghị & Đánh giá (data.js)
 * Tách biệt toàn bộ dữ liệu cấu hình, hội nghị liên quan và danh sách đánh giá.
 */

const CONFERENCE_DATA = {
  id: "cvpr-2026",
  code: "CVPR 2026",
  name: "IEEE/CVF Conference on Computer Vision and Pattern Recognition",
  eyebrow: "HỘI NGHỊ QUỐC TẾ HÀNG ĐẦU VỀ THỊ GIÁC MÁY TÍNH",
  summary: "Hội nghị hàng đầu thế giới về thị giác máy tính và nhận dạng mẫu, thu hút cộng đồng nghiên cứu toàn cầu với những công trình tiên tiến và có ảnh hưởng lớn.",
  description: [
    "CVPR (IEEE/CVF Conference on Computer Vision and Pattern Recognition) là hội nghị quốc tế uy tín nhất thế giới trong lĩnh vực thị giác máy tính và nhận dạng mẫu. Được tổ chức thường niên bởi IEEE và Computer Vision Foundation (CVF), CVPR là diễn đàn hàng đầu để công bố các nghiên cứu đột phá, chia sẻ ý tưởng mới và thúc đẩy hợp tác học thuật giữa các nhà nghiên cứu, kỹ sư và chuyên gia trong lĩnh vực trí tuệ nhân tạo và thị giác máy tính.",
    "CVPR 2026 sẽ được tổ chức tại Vancouver, Canada, quy tụ các nhà nghiên cứu, học giả và chuyên gia từ khắp nơi trên thế giới. Hội nghị bao gồm các phiên báo cáo khoa học, hội thảo chuyên đề (workshops), bài giảng mới (tutorials), và các sự kiện kết nối cộng đồng nghiên cứu."
  ],
  tags: ["computer vision", "deep learning", "multimodal"],
  location: "Vancouver, Canada",
  format: "Trực tiếp (In-person)",
  dates: "14 – 19 Jun 2026",
  publisher: "IEEE / Computer Vision Foundation (CVF)",
  deadline: "15 Jan 2026",
  daysLeft: 45,
  fields: "Computer Vision, Pattern Recognition, Machine Learning, AI",
  rank: "A",
  website: "https://cvpr.thecvf.com/",
  quote: "“Advancing computer vision for a more open world.”",
  quoteAuthor: "CVPR 2026",
  rating: 4.2,
  totalReviews: 128
};

const RELATED_CONFERENCES = [
  { s: "ICCV 2025", n: "IEEE/CVF International Conference on Computer Vision", t: ["computer vision", "deep learning", "3D vision"], d: 45, r: "A", c: ["#c9863f", "#3b5f8f"] },
  { s: "ECCV 2026", n: "European Conference on Computer Vision", t: ["computer vision", "representation learning", "AI"], d: 78, r: "A", c: ["#b5651d", "#5b86b5"] },
  { s: "WACV 2026", n: "IEEE/CVF Winter Conference on Applications of Computer Vision", t: ["computer vision", "medical imaging", "robotics"], d: 112, r: "B", c: ["#5f86b8", "#c9d6e6"] },
  { s: "NeurIPS 2026", n: "Conference on Neural Information Processing Systems", t: ["machine learning", "deep learning", "AI"], d: 60, r: "A", c: ["#3a2f7d", "#7a5cc4"] },
  { s: "ICML 2026", n: "International Conference on Machine Learning", t: ["machine learning", "optimization", "theory"], d: 95, r: "A", c: ["#1f6f6b", "#4ab3a8"] },
  { s: "AAAI 2027", n: "AAAI Conference on Artificial Intelligence", t: ["artificial intelligence", "reasoning", "multimodal"], d: 130, r: "A", c: ["#8a2d4d", "#d6728f"] },
  { s: "BMVC 2026", n: "British Machine Vision Conference", t: ["computer vision", "pattern recognition", "segmentation"], d: 150, r: "B", c: ["#2d4a8a", "#7aa0d6"] },
  { s: "ACCV 2026", n: "Asian Conference on Computer Vision", t: ["computer vision", "object detection", "AI"], d: 170, r: "B", c: ["#a63a2b", "#e59a6b"] },
  { s: "MICCAI 2026", n: "Medical Image Computing and Computer Assisted Intervention", t: ["medical imaging", "deep learning", "segmentation"], d: 88, r: "A", c: ["#1f5d8f", "#6bb6d6"] },
  { s: "ICLR 2027", n: "International Conference on Learning Representations", t: ["representation learning", "deep learning", "generative"], d: 105, r: "A", c: ["#3d6b2e", "#9bcf6a"] },
  { s: "ICRA 2027", n: "IEEE International Conference on Robotics and Automation", t: ["robotics", "computer vision", "control"], d: 140, r: "A", c: ["#555f6d", "#a9b6c6"] },
  { s: "ACM MM 2026", n: "ACM International Conference on Multimedia", t: ["multimodal", "video", "retrieval"], d: 72, r: "A", c: ["#7a3d8f", "#d68ad6"] }
];

const REVIEWS_DISTRIBUTION = {
  5: 60,
  4: 44,
  3: 17,
  2: 4,
  1: 3
};

const REVIEW_TEXTS = {
  5: [
    "Hội nghị rất uy tín, nội dung chất lượng cao, rất đáng để gửi bài.",
    "Tổ chức chuyên nghiệp, nhiều bài keynote hay và cơ hội kết nối tốt.",
    "Phản hồi của reviewer công tâm và rất hữu ích cho bài báo của mình.",
    "Workshop và tutorial rất bổ ích, đặc biệt cho người mới bắt đầu.",
    "Chất lượng bài báo thuộc hàng top, học hỏi được rất nhiều.",
    "Chương trình sắp xếp hợp lý, địa điểm tổ chức tuyệt vời."
  ],
  4: [
    "Hội nghị tốt nhưng tỷ lệ chấp nhận khá thấp, cần chuẩn bị kỹ.",
    "Chương trình phong phú, tuy nhiên các phiên poster hơi đông.",
    "Nội dung hay, chi phí tham dự hơi cao với sinh viên.",
    "Quy trình nộp bài rõ ràng, thời gian phản hồi hơi lâu.",
    "Rất đáng tham dự, chỉ tiếc lịch trình khá dày."
  ],
  3: [
    "Chất lượng không đồng đều giữa các phiên báo cáo.",
    "Số lượng bài quá nhiều nên khó theo dõi hết.",
    "Nhận xét của reviewer đôi khi chưa thật sự chi tiết.",
    "Hội nghị ổn nhưng mình kỳ vọng cao hơn một chút."
  ],
  2: [
    "Phản hồi từ reviewer ngắn và chưa thuyết phục.",
    "Quá đông, khó trao đổi trực tiếp với tác giả."
  ],
  1: [
    "Bài bị từ chối mà nhận xét quá chung chung.",
    "Chi phí cao, trải nghiệm không như mong đợi."
  ]
};

const REVIEW_TAILS = [
  "Mình sẽ tiếp tục theo dõi các kỳ tiếp theo.",
  "Nên đăng ký sớm để có giá tốt.",
  "Phần networking khá thú vị.",
  "Hy vọng năm sau tổ chức tốt hơn nữa.",
  "",
  "",
  ""
];

/**
 * Sinh danh sách 128 đánh giá ổn định dựa trên seed 2026
 */
function generateReviewsData() {
  function mulberry(seed) {
    return () => {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const rand = mulberry(2026);
  const pick = arr => arr[Math.floor(rand() * arr.length)];

  const starsArr = [];
  for (const s in REVIEWS_DISTRIBUTION) {
    for (let k = 0; k < REVIEWS_DISTRIBUTION[s]; k++) {
      starsArr.push(+s);
    }
  }

  for (let i = starsArr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [starsArr[i], starsArr[j]] = [starsArr[j], starsArr[i]];
  }

  return starsArr.map((s, i) => ({
    id: i + 1,
    name: 'guestname' + (i + 1),
    stars: s,
    text: (pick(REVIEW_TEXTS[s]) + ' ' + (s >= 3 ? pick(REVIEW_TAILS) : '')).trim(),
    likes: Math.floor(rand() * 40),
    dislikes: Math.floor(rand() * 6),
    vote: null
  }));
}

// Gắn vào window / globalThis để các file JS khác luôn truy cập được
if (typeof window !== 'undefined') {
  window.CONFERENCE_DATA = CONFERENCE_DATA;
  window.RELATED_CONFERENCES = RELATED_CONFERENCES;
  window.REVIEWS_DISTRIBUTION = REVIEWS_DISTRIBUTION;
  window.generateReviewsData = generateReviewsData;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CONFERENCE_DATA,
    RELATED_CONFERENCES,
    REVIEWS_DISTRIBUTION,
    generateReviewsData
  };
}

