const conferences = [
  {
    id: 1, name: "NeurIPS", subtitle: "Conference on Neural Information Processing Systems",
    location: "New Orleans, USA", date: "2026-12-06", dateText: "6 – 12 Dec 2026",
    deadline: "2026-05-13", deadlineText: "13 May 2026", mode: "Offline", rank: "A*",
    fields: ["ai"], tags: ["machine learning", "deep learning", "neural networks", "AI"],
    image: "images/neurips.svg",
    description: "Hội nghị hàng đầu thế giới về học máy và khoa học thần kinh tính toán, thu hút hàng nghìn nhà nghiên cứu và chuyên gia mỗi năm."
  },
  {
    id: 2, name: "CVPR", subtitle: "IEEE/CVF Conference on Computer Vision and Pattern Recognition",
    location: "Vancouver, Canada", date: "2026-06-14", dateText: "14 – 19 Jun 2026",
    deadline: "2026-01-15", deadlineText: "15 Jan 2026", mode: "Offline", rank: "A",
    fields: ["cv", "ai"], tags: ["computer vision", "pattern recognition", "deep learning", "multimodal"],
    image: "images/cvpr.svg",
    description: "Hội nghị hàng đầu thế giới về thị giác máy tính và nhận dạng mẫu, thu hút cộng đồng nghiên cứu quốc tế."
  },
  {
    id: 3, name: "ICLR", subtitle: "International Conference on Learning Representations",
    location: "Singapore", date: "2026-04-26", dateText: "26 – 30 Apr 2026",
    deadline: "2025-10-22", deadlineText: "22 Oct 2025", mode: "Offline", rank: "A*",
    fields: ["ai"], tags: ["representation learning", "deep learning", "AI", "foundation models"],
    image: "images/iclr.svg",
    description: "Hội nghị hàng đầu về biểu diễn học và học sâu, tập trung vào các phương pháp học biểu diễn và mô hình nền tảng."
  },
  {
    id: 4, name: "ACL", subtitle: "Annual Meeting of the Association for Computational Linguistics",
    location: "Vienna, Austria", date: "2026-07-05", dateText: "5 – 10 Jul 2026",
    deadline: "2026-02-18", deadlineText: "18 Feb 2026", mode: "Hybrid", rank: "A*",
    fields: ["nlp", "ai"], tags: ["NLP", "language models", "LLM", "computational linguistics"],
    image: "images/acl.svg",
    description: "Diễn đàn quốc tế về xử lý ngôn ngữ tự nhiên, ngôn ngữ học tính toán và các mô hình ngôn ngữ hiện đại."
  },
  {
    id: 5, name: "IEEE S&P", subtitle: "IEEE Symposium on Security and Privacy",
    location: "San Francisco, USA", date: "2026-05-18", dateText: "18 – 20 May 2026",
    deadline: "2025-11-14", deadlineText: "14 Nov 2025", mode: "Offline", rank: "A*",
    fields: ["security"], tags: ["cyber security", "privacy", "systems security", "network security"],
    image: "images/security.svg",
    description: "Hội nghị nghiên cứu về bảo mật máy tính, quyền riêng tư và an toàn hệ thống."
  },
  {
    id: 6, name: "KDD", subtitle: "ACM SIGKDD Conference on Knowledge Discovery and Data Mining",
    location: "Long Beach, USA", date: "2026-08-09", dateText: "9 – 13 Aug 2026",
    deadline: "2026-03-04", deadlineText: "4 Mar 2026", mode: "Offline", rank: "A*",
    fields: ["data", "ai"], tags: ["data mining", "knowledge discovery", "machine learning", "analytics"],
    image: "images/kdd.svg",
    description: "Hội nghị lớn về khai phá dữ liệu, khám phá tri thức, học máy và phân tích dữ liệu."
  }
];
