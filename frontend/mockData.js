/**
 * AgriScan AI - Mock Data for Demo Purposes
 * 
 * This file provides mock data for all API endpoints to enable demoing
 * without requiring a backend server.
 */

// Mock data for home endpoint
export const mockHomeData = {
  stats: [
    { label: 'Tổng quan hôm nay', value: '12', icon: 'analytics', color: 'primary' },
    { label: 'Cần chú ý', value: '3', icon: 'error', color: 'status-danger' },
    { label: 'Cây khỏe', value: '9', icon: 'eco', color: 'status-healthy' }
  ],
  recent: [
    {
      id: 'scan_001',
      plant: 'Lúa',
      disease: 'Leaf Blast',
      image: 'https://via.placeholder.com/150x150/4CAF50/FFFFFF?text=Lua+Leaf+Blast',
      confidence: '85',
      time: '2 giờ trước',
      severity: 'warning',
      label: 'Cảnh báo nhỏ'
    },
    {
      id: 'scan_002',
      plant: 'Cà chua',
      disease: 'Early Blight',
      image: 'https://via.placeholder.com/150x150/FF9800/FFFFFF?text=Ca+chua+Early+Blight',
      confidence: '92',
      time: '5 giờ trước',
      severity: 'danger',
      label: 'Nguy hiểm'
    }
  ],
  articles: [
    {
      id: 'art_001',
      image: 'https://via.placeholder.com/300x200/8BC34A/FFFFFF?text=Tip+1',
      label: 'Mẹo',
      labelColor: 'green',
      time: 'Hôm nay',
      title: 'Cách phòng trừ sâu bệnh cho mùa hè',
      action: 'Đọc thêm',
      tagBg: '#E8F5E9'
    },
    {
      id: 'art_002',
      image: 'https://via.placeholder.com/300x200/FFEB3B/000000?text=Tip+2',
      label: 'Cảnh báo',
      labelColor: 'orange',
      time: 'Hôm qua',
      title: 'Dự báo thời tiết影响作物生长',
      action: 'Xem chi tiết',
      tagBg: '#FFF3E0'
    }
  ]
};

// Mock data for scan session
export const mockScanSession = {
  id: 'scan_processing_001',
  crop: 'Lúa',
  disease: 'Leaf Blast',
  image: 'https://via.placeholder.com/300x200/4CAF50/FFFFFF?text=Processing+Image',
  confidence: '0',
  severity: 'healthy',
  time: 'Vừa bắt đầu',
  pipeline: [
    {
      id: 'p1',
      icon: 'camera',
      title: 'Chụp ảnh lá',
      desc: 'Đã chụp ảnh',
      status: 'Hoàn tất',
      active: true,
      iconBg: '#DBEAFE',
      iconColor: '#2563EB'
    },
    {
      id: 'p2',
      icon: 'biotech',
      title: 'Phân tích Cloudflare LLaMA Vision',
      desc: 'Nhận diện: Leaf Blast',
      status: 'Đang xử lý',
      active: true,
      iconBg: '#FEF3C7',
      iconColor: '#D97706'
    },
    {
      id: 'p3',
      icon: 'agronheart',
      title: 'Giải pháp điều trị',
      desc: 'Đang phân tích độ tin cậy...',
      status: 'Chờ',
      active: false,
      iconBg: '#DCFCE7',
      iconColor: '#16A34A'
    }
  ],
  detections: [
    {
      id: 'd1',
      top: '32%',
      left: '38%',
      confidence: '78%',
      severity: 'warning'
    },
    {
      id: 'd2',
      top: '65%',
      left: '45%',
      confidence: '82%',
      severity: 'danger'
    }
  ]
};

// Mock data for result report
export const mockResultReport = {
  id: 'scan_result_001',
  crop: 'Lúa',
  disease: 'Leaf Blast',
  pathogen: 'Magnaporthe oryzae',
  severity: 'warning',
  image: 'https://via.placeholder.com/400x300/4CAF50/FFFFFF?text=Leaf+Blast+Detection',
  confidence: '85',
  time: '10:30 AM',
  status: {
    spread: 'Chậm',
    stage: 'Khởi phát',
    loss: '5 - 10%'
  },
  recommendation: 'Phun nabiocin vào buổi sớm hoặc chiều t wyposaż để防治稻瘟病。保持田间排水，避免积水。',
  accordion: [
    {
      id: 'acc_001',
      icon: 'microscope',
      title: 'Về bệnh Leaf Blast',
      subtitle: 'Một bệnh nấm gefährな peligrosa',
      sections: [
        {
          icon: 'eco',
          title: 'Triệu chứng',
          body: 'Các vệt троянおそмров на листах, initialement маленькие pontos marrons que se ampliam'
        },
        {
          icon: 'healing',
          title: 'Phòng trừ',
          body: 'Xử lý đất trước khi trồng, sử dụng giống-resistant, cân bằng dinh dưỡng'
        }
      ]
    }
  ],
  detections: [
    {
      id: 'd1',
      top: '32%',
      left: '38%',
      confidence: '78%',
      severity: 'warning'
    },
    {
      id: 'd2',
      top: '65%',
      left: '45%',
      confidence: '82%',
      severity: 'danger'
    }
  ]
};

// Mock data for history
export const mockHistoryData = {
  records: [
    {
      id: 'scan_001',
      crop: 'rice',
      cropLabel: 'Lúa',
      title: 'Leaf Blast',
      confidence: '85',
      severity: 'warning',
      time: '2 giờ trước',
      image: 'https://via.placeholder.com/100x100/4CAF50/FFFFFF?text=Lua'
    },
    {
      id: 'scan_002',
      crop: 'tomato',
      cropLabel: 'Cà chua',
      title: 'Early Blight',
      confidence: '92',
      severity: 'danger',
      time: '5 giờ trước',
      image: 'https://via.placeholder.com/100x100/FF9800/FFFFFF?text=Ca+chua'
    },
    {
      id: 'scan_003',
      crop: 'fruit',
      cropLabel: 'Cây ăn trái',
      title: 'Healthy Leaf',
      confidence: '96',
      severity: 'healthy',
      time: '1 ngày trước',
      image: 'https://via.placeholder.com/100x100/8BC34A/FFFFFF?text=Cay+an+tra'
    }
  ],
  filters: [
    { key: 'all', label: 'Tất cả', icon: 'apps' },
    { key: 'rice', label: 'Lúa', icon: 'eco' },
    { key: 'tomato', label: 'Cà chua', icon: 'favorites' },
    { key: 'fruit', label: 'Cây ăn trái', icon: 'apple' },
    { key: 'danger', label: 'Báo động', icon: 'warning' }
  ]
};

// Mock data for guides
export const mockGuides = [
  {
    id: 'guide_001',
    icon: 'eco',
    title: 'Hướng dẫn trồng lúa',
    subtitle: 'Các kỹ thuật canh tác hiện đại',
    sections: [
      {
        icon: 'settings',
        title: 'Chuẩn bị đất',
        body: 'Đất cần được xới sâu 20-25cm, bón phân cơ thể trước khi l-м',
        badge: 'QUAN TRỌNG',
        badgeBg: '#FFEB3B',
        badgeText: 'ĐEN'
      },
      {
        icon: 'water_drop',
        title: 'Tưới nước',
        body: 'Giữ ẩm đồng đều, đặc biệt trong périodes de tillering et de floraison',
        badge: 'MẸO',
        badgeBg: '#4CAF50',
        badgeText: 'XANH'
      }
    ]
  }
];

// Mock data for auth
export const mockAuthUser = {
  email: 'demo@agriscan.ai',
  name: 'Người dùng демонstration',
  avatar: 'https://via.placeholder.com/100x100/4CAF50/FFFFFF?text=USER'
};

export const mockAuthState = {
  authenticated: true,
  user: mockAuthUser,
  token: 'mock-jwt-token-demo-12345'
};

// Mock data for chat
export const mockChatResponse = {
  role: 'assistant',
  content: 'Tôi là trợ lý AgriScan AI. Bạn có thể hỏi tôi về bệnh lá cây, cách phòng trừ, hoặc chăm sóc cây trồng. Bạn muốn biết về vấn đề gì hôm nay?',
  timestamp: new Date().toISOString()
};