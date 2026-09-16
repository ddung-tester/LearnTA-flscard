/**
 * fix-a0-a1-cards.js
 * Cập nhật trực tiếp 20 từ đầu tiên (bị rập khuôn từ lần chạy thử đầu)
 * và từ 204 ('cycle') bằng các câu mẫu A0-A1 tự nhiên, đơn giản.
 * Không gọi API, nạp trực tiếp vào DB trong 1 giây.
 */
require("dotenv/config");
const pool = require("./src/config/db");

const TENSES_DATA = {
  1: [ // cds
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "I have some old CDs.", highlight: "CDs", translation: "Tôi có vài đĩa CD cũ." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "He is listening to his favorite CDs.", highlight: "CDs", translation: "Anh ấy đang nghe những đĩa CD yêu thích." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "Mom bought these music CDs yesterday.", highlight: "CDs", translation: "Mẹ đã mua những đĩa CD nhạc này hôm qua." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "We were playing old CDs last night.", highlight: "CDs", translation: "Tối qua chúng tôi đang bật các đĩa CD cũ." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "I have collected ten music CDs.", highlight: "CDs", translation: "Tôi đã sưu tập được mười đĩa CD nhạc." },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will give you these CDs.", highlight: "CDs", translation: "Tôi sẽ tặng bạn những đĩa CD này." }
  ],
  2: [ // boring
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "This long movie is so boring.", highlight: "boring", translation: "Bộ phim dài này thật nhàm chán." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "This game is getting boring now.", highlight: "boring", translation: "Trò chơi này giờ đang trở nên nhàm chán." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "The meeting yesterday was very boring.", highlight: "boring", translation: "Cuộc họp hôm qua rất chán." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "The show was being boring at first.", highlight: "boring", translation: "Lúc đầu chương trình hơi nhàm chán." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "Today has been a boring day.", highlight: "boring", translation: "Hôm nay quả là một ngày nhàm chán." },
    { tense: "future_simple", formula: "S + will + V", sentence: "Waiting here will be very boring.", highlight: "boring", translation: "Chờ ở đây sẽ rất chán đấy." }
  ],
  3: [ // there's flying robot in this game
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "There is a flying robot in this game.", highlight: "flying robot", translation: "Có một con robot bay trong trò chơi này." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "A robot is flying in this game.", highlight: "flying", translation: "Một con robot đang bay trong trò chơi này." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "There was a flying robot here.", highlight: "flying robot", translation: "Từng có một con robot bay ở đây." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "A robot was flying around us.", highlight: "flying", translation: "Một con robot lúc đó đang bay quanh chúng tôi." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "I have seen a flying robot.", highlight: "flying robot", translation: "Tôi đã thấy một con robot bay." },
    { tense: "future_simple", formula: "S + will + V", sentence: "You will see a flying robot.", highlight: "flying robot", translation: "Bạn sẽ thấy một con robot bay." }
  ],
  4: [ // can i have it?
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "Can I have it, please?", highlight: "Can I have it", translation: "Tôi có thể lấy cái này được không?" },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "Am I having it right now?", highlight: "having it", translation: "Tôi đang sở hữu nó lúc này phải không?" },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "I asked, can I have it?", highlight: "can I have it", translation: "Tôi đã hỏi, tôi có thể lấy nó không?" },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "I was wondering, can I have it?", highlight: "can I have it", translation: "Lúc đó tôi đang tự hỏi, liệu tôi có thể lấy nó không?" },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "I have asked if I can have it.", highlight: "have it", translation: "Tôi đã hỏi liệu mình có thể lấy nó không." },
    { tense: "future_simple", formula: "S + will + V", sentence: "Can I have it tomorrow?", highlight: "Can I have it", translation: "Ngày mai tôi có thể lấy nó được không?" }
  ],
  5: [ // how much is that shirt?
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "Excuse me, how much is that shirt?", highlight: "how much is that shirt", translation: "Xin hỏi, chiếc áo đó giá bao nhiêu?" },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "Are you asking how much that shirt is?", highlight: "that shirt", translation: "Bạn đang hỏi chiếc áo đó giá bao nhiêu à?" },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "I asked how much that shirt was.", highlight: "that shirt", translation: "Tôi đã hỏi chiếc áo đó giá bao nhiêu." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "She was checking how much that shirt cost.", highlight: "that shirt", translation: "Cô ấy lúc đó đang xem chiếc áo đó giá bao nhiêu." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "Have you asked how much that shirt is?", highlight: "that shirt", translation: "Bạn đã hỏi chiếc áo đó giá bao nhiêu chưa?" },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will ask how much that shirt is.", highlight: "that shirt", translation: "Tôi sẽ hỏi xem chiếc áo đó giá bao nhiêu." }
  ],
  6: [ // that
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "I really like that blue hat.", highlight: "that", translation: "Tôi rất thích chiếc mũ màu xanh đó." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "Look, what is that moving thing?", highlight: "that", translation: "Nhìn kìa, cái vật đang di chuyển đó là gì vậy?" },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "I saw that yesterday at school.", highlight: "that", translation: "Hôm qua tôi đã nhìn thấy điều đó ở trường." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "Were you thinking about that yesterday?", highlight: "that", translation: "Hôm qua bạn có đang nghĩ về điều đó không?" },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "I have heard that news already.", highlight: "that", translation: "Tôi đã nghe tin đó rồi." },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will remember that good advice.", highlight: "that", translation: "Tôi sẽ nhớ lời khuyên tốt đó." }
  ],
  7: [ // i like that hat
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "I like that hat very much.", highlight: "like that hat", translation: "Tôi rất thích chiếc mũ đó." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "I am looking at that hat.", highlight: "that hat", translation: "Tôi đang ngắm chiếc mũ đó." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "I liked that hat in the shop.", highlight: "liked that hat", translation: "Tôi đã rất thích chiếc mũ đó trong cửa hàng." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "I was looking at that hat earlier.", highlight: "that hat", translation: "Hồi nãy tôi đã đang ngắm chiếc mũ đó." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "I have always liked that hat.", highlight: "liked that hat", translation: "Tôi luôn thích chiếc mũ đó." },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will buy that hat tomorrow.", highlight: "that hat", translation: "Tôi sẽ mua chiếc mũ đó vào ngày mai." }
  ],
  8: [ // skirt
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "That skirt looks nice on you.", highlight: "skirt", translation: "Chiếc váy đó trông rất hợp với bạn." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "She is wearing a red skirt.", highlight: "skirt", translation: "Cô ấy đang mặc một chiếc váy đỏ." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "I bought this skirt yesterday.", highlight: "skirt", translation: "Hôm qua tôi đã mua chiếc váy này." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "Mom was ironing my pink skirt.", highlight: "skirt", translation: "Mẹ lúc đó đang là chiếc váy hồng của tôi." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "She has washed that dirty skirt.", highlight: "skirt", translation: "Cô ấy đã giặt sạch chiếc váy bẩn đó rồi." },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will wear my new skirt.", highlight: "skirt", translation: "Tôi sẽ mặc chiếc váy mới của mình." }
  ],
  9: [ // restroom
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "Where is the nearest restroom, please?", highlight: "restroom", translation: "Xin hỏi, nhà vệ sinh gần nhất ở đâu?" },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "He is walking to the restroom.", highlight: "restroom", translation: "Anh ấy đang đi về phía nhà vệ sinh." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "I used the restroom before class.", highlight: "restroom", translation: "Tôi đã đi vệ sinh trước giờ học." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "Someone was knocking on the restroom door.", highlight: "restroom", translation: "Ai đó lúc ấy đang gõ cửa nhà vệ sinh." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "They have cleaned the restroom today.", highlight: "restroom", translation: "Hôm nay họ đã dọn nhà vệ sinh rồi." },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will go to the restroom.", highlight: "restroom", translation: "Tôi sẽ đi vệ sinh một lát." }
  ],
  10: [ // pants
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "These black pants fit me well.", highlight: "pants", translation: "Chiếc quần đen này vừa vặn với tôi." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "He is putting on his pants.", highlight: "pants", translation: "Anh ấy đang mặc quần vào." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "I bought new pants last Sunday.", highlight: "pants", translation: "Chủ nhật trước tôi đã mua một chiếc quần mới." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "She was washing my dirty pants.", highlight: "pants", translation: "Lúc đó cô ấy đang giặt chiếc quần bẩn của tôi." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "I have ironed these clean pants.", highlight: "pants", translation: "Tôi đã là phẳng chiếc quần sạch này rồi." },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will wear these warm pants.", highlight: "pants", translation: "Tôi sẽ mặc chiếc quần ấm này." }
  ],
  11: [ // walks into a clothes store
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "She walks into a clothes store.", highlight: "walks into a clothes store", translation: "Cô ấy bước vào một cửa hàng quần áo." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "He is walking into a clothes store.", highlight: "walking into a clothes store", translation: "Anh ấy đang bước vào một cửa hàng quần áo." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "She walked into a clothes store.", highlight: "walked into a clothes store", translation: "Cô ấy đã bước vào một cửa hàng quần áo." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "We were walking into a clothes store.", highlight: "walking into a clothes store", translation: "Lúc đó chúng tôi đang bước vào một cửa hàng quần áo." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "She has walked into that clothes store.", highlight: "walked into that clothes store", translation: "Cô ấy vừa bước vào cửa hàng quần áo đó." },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will walk into that clothes store.", highlight: "walk into that clothes store", translation: "Tôi sẽ bước vào cửa hàng quần áo đó." }
  ],
  12: [ // shirt
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "This white shirt looks very clean.", highlight: "shirt", translation: "Chiếc áo sơ mi trắng này trông rất sạch." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "He is wearing a blue shirt.", highlight: "shirt", translation: "Anh ấy đang mặc một chiếc áo sơ mi màu xanh." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "Dad gave me this nice shirt.", highlight: "shirt", translation: "Bố đã tặng tôi chiếc áo sơ mi đẹp này." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "Mom was washing my school shirt.", highlight: "shirt", translation: "Lúc đó mẹ đang giặt chiếc áo sơ mi đi học của tôi." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "I have washed this dirty shirt.", highlight: "shirt", translation: "Tôi đã giặt chiếc áo sơ mi bẩn này rồi." },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will wear a warm shirt.", highlight: "shirt", translation: "Tôi sẽ mặc một chiếc áo sơ mi ấm." }
  ],
  13: [ // short
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "This wooden chair is too short.", highlight: "short", translation: "Chiếc ghế gỗ này thấp quá." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "His hair is getting too short.", highlight: "short", translation: "Tóc của cậu ấy đang quá ngắn rồi." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "My hair was short last year.", highlight: "short", translation: "Năm ngoái tóc tôi ngắn." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "The days were getting short in winter.", highlight: "short", translation: "Những ngày mùa đông lúc đó đang ngắn dần lại." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "The film has been very short.", highlight: "short", translation: "Bộ phim vừa rồi rất ngắn gọn." },
    { tense: "future_simple", formula: "S + will + V", sentence: "The meeting will be very short.", highlight: "short", translation: "Cuộc họp sẽ rất ngắn gọn thôi." }
  ],
  14: [ // dress
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "She loves this beautiful yellow dress.", highlight: "dress", translation: "Cô ấy rất thích chiếc đầm màu vàng xinh đẹp này." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "Anna is trying on a new dress.", highlight: "dress", translation: "Anna đang thử một chiếc đầm mới." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "Mom made this dress for me.", highlight: "dress", translation: "Mẹ đã may chiếc đầm này cho tôi." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "She was wearing a pretty dress.", highlight: "dress", translation: "Lúc đó cô ấy đang diện một chiếc đầm rất xinh." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "She has chosen a red dress.", highlight: "dress", translation: "Cô ấy đã chọn một chiếc đầm đỏ." },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will buy that party dress.", highlight: "dress", translation: "Tôi sẽ mua chiếc đầm dự tiệc đó." }
  ],
  15: [ // clothes
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "These clean clothes smell so good.", highlight: "clothes", translation: "Số quần áo sạch này thơm quá." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "Mom is folding our clothes now.", highlight: "clothes", translation: "Bây giờ mẹ đang gấp quần áo của chúng tôi." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "I put my clothes in the bag.", highlight: "clothes", translation: "Tôi đã để quần áo vào trong túi." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "She was packing her clothes all night.", highlight: "clothes", translation: "Cô ấy lúc đó đang xếp quần áo suốt buổi tối." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "I have changed my clothes already.", highlight: "clothes", translation: "Tôi đã thay quần áo xong rồi." },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will wash these dirty clothes.", highlight: "clothes", translation: "Tôi sẽ giặt đống quần áo bẩn này." }
  ],
  16: [ // vacation
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "A beach vacation is so relaxing.", highlight: "vacation", translation: "Một kỳ nghỉ ở biển thật là thư giãn." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "We are enjoying our summer vacation.", highlight: "vacation", translation: "Chúng tôi đang tận hưởng kỳ nghỉ hè." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "We went to Da Nang on vacation.", highlight: "vacation", translation: "Chúng tôi đã đi Đà Nẵng vào kỳ nghỉ." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "They were planning their next vacation.", highlight: "vacation", translation: "Lúc đó họ đang lên kế hoạch cho kỳ nghỉ tiếp theo." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "I have had a great vacation.", highlight: "vacation", translation: "Tôi đã có một kỳ nghỉ thật tuyệt vời." },
    { tense: "future_simple", formula: "S + will + V", sentence: "Next week will be our vacation.", highlight: "vacation", translation: "Tuần tới sẽ là kỳ nghỉ của chúng tôi." }
  ],
  17: [ // fries
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "These hot fries taste so good.", highlight: "fries", translation: "Chỗ khoai tây chiên nóng hổi này ngon quá." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "The kids are eating french fries.", highlight: "fries", translation: "Lũ trẻ đang ăn khoai tây chiên." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "We ordered a plate of fries.", highlight: "fries", translation: "Chúng tôi đã gọi một đĩa khoai tây chiên." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "He was frying hot fries for lunch.", highlight: "fries", translation: "Lúc đó anh ấy đang chiên khoai tây nóng cho bữa trưa." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "I have finished all my fries.", highlight: "fries", translation: "Tôi đã ăn hết phần khoai tây chiên của mình rồi." },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will make some crispy fries.", highlight: "fries", translation: "Tôi sẽ làm một ít khoai tây chiên giòn." }
  ],
  18: [ // lettuce
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "Fresh lettuce makes the salad delicious.", highlight: "lettuce", translation: "Rau xà lách tươi làm món salad rất ngon." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "Mom is washing the green lettuce.", highlight: "lettuce", translation: "Mẹ đang rửa rau xà lách xanh." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "I bought some fresh lettuce today.", highlight: "lettuce", translation: "Hôm nay tôi đã mua một ít xà lách tươi." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "She was chopping lettuce for dinner.", highlight: "lettuce", translation: "Lúc đó cô ấy đang thái xà lách cho bữa tối." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "We have grown fresh lettuce at home.", highlight: "lettuce", translation: "Chúng tôi đã tự trồng được xà lách tươi ở nhà." },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will add more lettuce here.", highlight: "lettuce", translation: "Tôi sẽ cho thêm rau xà lách vào đây." }
  ],
  19: [ // tomato
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "This red tomato is very sweet.", highlight: "tomato", translation: "Quả cà chua đỏ này rất ngọt." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "He is slicing a big tomato.", highlight: "tomato", translation: "Anh ấy đang cắt lát một quả cà chua to." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "I picked a ripe tomato outside.", highlight: "tomato", translation: "Tôi đã hái một quả cà chua chín ở ngoài vườn." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "Mom was cutting tomato for soup.", highlight: "tomato", translation: "Lúc đó mẹ đang cắt cà chua để nấu canh." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "I have eaten a fresh tomato.", highlight: "tomato", translation: "Tôi vừa ăn một quả cà chua tươi." },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will buy another red tomato.", highlight: "tomato", translation: "Tôi sẽ mua thêm một quả cà chua đỏ nữa." }
  ],
  20: [ // i do not want meat
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "I do not want meat today.", highlight: "do not want meat", translation: "Hôm nay tôi không muốn ăn thịt." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "I am saying, I do not want meat.", highlight: "do not want meat", translation: "Tôi đang nói là tôi không muốn ăn thịt mà." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "I did not want meat yesterday.", highlight: "did not want meat", translation: "Hôm qua tôi đã không muốn ăn thịt." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "I was telling him, I do not want meat.", highlight: "do not want meat", translation: "Lúc đó tôi đang nói với anh ấy rằng tôi không muốn ăn thịt." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "I have said that I do not want meat.", highlight: "do not want meat", translation: "Tôi đã nói là tôi không muốn ăn thịt rồi." },
    { tense: "future_simple", formula: "S + will + V", sentence: "I will not want meat for dinner.", highlight: "not want meat", translation: "Tôi sẽ không muốn ăn thịt vào bữa tối đâu." }
  ],
  204: [ // cycle (đạp xe)
    { tense: "present_simple", formula: "S + V(s/es)", sentence: "I cycle to school every morning.", highlight: "cycle", translation: "Tôi đạp xe đến trường mỗi sáng." },
    { tense: "present_continuous", formula: "S + am/is/are + V-ing", sentence: "Tom is cycling in the park.", highlight: "cycling", translation: "Tom đang đạp xe trong công viên." },
    { tense: "past_simple", formula: "S + V2/V-ed", sentence: "We cycled around the lake yesterday.", highlight: "cycled", translation: "Hôm qua chúng tôi đã đạp xe quanh hồ." },
    { tense: "past_continuous", formula: "S + was/were + V-ing", sentence: "He was cycling when it started raining.", highlight: "cycling", translation: "Anh ấy đang đạp xe thì trời bắt đầu mưa." },
    { tense: "present_perfect", formula: "S + have/has + V3", sentence: "I have cycled five kilometers today.", highlight: "cycled", translation: "Hôm nay tôi đã đạp xe được năm cây số rồi." },
    { tense: "future_simple", formula: "S + will + V", sentence: "We will cycle together this weekend.", highlight: "cycle", translation: "Cuối tuần này chúng mình sẽ cùng đạp xe nhé." }
  ]
};

async function run() {
  console.log("Updating handcrafted A0-A1 examples directly into DB...");
  let count = 0;
  for (const [idStr, examples] of Object.entries(TENSES_DATA)) {
    const id = Number(idStr);
    await pool.query(
      "UPDATE cards SET tense_examples = ? WHERE id = ?",
      [JSON.stringify(examples), id]
    );
    count++;
  }
  console.log(`Successfully updated ${count} cards directly in DB!`);
  await pool.end();
}

run().catch((err) => {
  console.error("Error updating cards:", err);
  process.exit(1);
});
