import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';

const TAROT_CARDS = [
  {
    id: 0, numeral: 'O', symbol: '🌟', name: 'Kẻ Ngốc', en: 'The Fool',
    gradient: 'from-yellow-400 to-amber-500',
    desc: 'Năng lượng tươi mới và khởi đầu mới. Hôm nay hãy tin vào trực giác, may mắn đến từ những nơi bất ngờ nhất.',
    numbers: ['00', '05', '50', '10', '01'],
  },
  {
    id: 1, numeral: 'I', symbol: '⚡', name: 'Pháp Sư', en: 'The Magician',
    gradient: 'from-red-500 to-rose-700',
    desc: 'Ý chí mạnh mẽ và khả năng biến ý tưởng thành hiện thực. Tập trung vào mục tiêu, năng lượng hôm nay hoàn toàn ủng hộ bạn.',
    numbers: ['01', '11', '14', '41', '10'],
  },
  {
    id: 2, numeral: 'II', symbol: '🌙', name: 'Nữ Giáo Chủ', en: 'The High Priestess',
    gradient: 'from-indigo-500 to-violet-700',
    desc: 'Trực giác sâu sắc và tri thức ẩn. Lắng nghe tiếng nói bên trong, hôm nay bạn nhạy cảm và sáng suốt hơn bình thường.',
    numbers: ['02', '20', '22', '29', '92'],
  },
  {
    id: 3, numeral: 'III', symbol: '🌸', name: 'Nữ Hoàng', en: 'The Empress',
    gradient: 'from-pink-400 to-rose-600',
    desc: 'Phong phú và nuôi dưỡng. Năng lượng sinh sôi nảy nở, mọi điều bạn chăm chút hôm nay đều có kết quả tốt đẹp.',
    numbers: ['03', '30', '33', '36', '63'],
  },
  {
    id: 4, numeral: 'IV', symbol: '👑', name: 'Hoàng Đế', en: 'The Emperor',
    gradient: 'from-orange-500 to-red-600',
    desc: 'Quyền lực và sự ổn định. Hôm nay hãy đứng vững lập trường, sự quyết đoán và tự tin sẽ mang lại thành công.',
    numbers: ['04', '40', '13', '31', '44'],
  },
  {
    id: 5, numeral: 'V', symbol: '🗝️', name: 'Giáo Chủ', en: 'The Hierophant',
    gradient: 'from-emerald-500 to-teal-700',
    desc: 'Truyền thống và trí tuệ. Đi theo con đường đã được chứng minh, kinh nghiệm là chìa khóa thành công hôm nay.',
    numbers: ['05', '50', '55', '15', '51'],
  },
  {
    id: 6, numeral: 'VI', symbol: '💕', name: 'Đôi Tình Nhân', en: 'The Lovers',
    gradient: 'from-rose-400 to-pink-600',
    desc: 'Hòa hợp và kết nối. Năng lượng yêu thương bao phủ xung quanh, mọi mối quan hệ và hợp tác đều thuận lợi hôm nay.',
    numbers: ['06', '60', '16', '61', '26'],
  },
  {
    id: 7, numeral: 'VII', symbol: '🏆', name: 'Cỗ Xe Chiến', en: 'The Chariot',
    gradient: 'from-blue-500 to-cyan-700',
    desc: 'Chiến thắng và ý chí kiên định. Tiến về phía trước với quyết tâm mạnh mẽ, không có gì có thể cản được bạn hôm nay.',
    numbers: ['07', '70', '17', '71', '27'],
  },
  {
    id: 8, numeral: 'VIII', symbol: '🦁', name: 'Sức Mạnh', en: 'Strength',
    gradient: 'from-amber-500 to-orange-700',
    desc: 'Dũng cảm và kiên nhẫn. Sức mạnh nội tâm chính là vũ khí lớn nhất của bạn, hãy tin tưởng vào bản thân hôm nay.',
    numbers: ['08', '80', '18', '81', '28'],
  },
  {
    id: 9, numeral: 'IX', symbol: '🕯️', name: 'Ẩn Sĩ', en: 'The Hermit',
    gradient: 'from-slate-500 to-gray-700',
    desc: 'Suy ngẫm sâu và tìm kiếm bên trong. Đôi khi câu trả lời tốt nhất đến từ sự tĩnh lặng và kiên nhẫn quan sát.',
    numbers: ['09', '90', '18', '27', '36'],
  },
  {
    id: 10, numeral: 'X', symbol: '☸️', name: 'Bánh Xe Vận Mệnh', en: 'Wheel of Fortune',
    gradient: 'from-violet-500 to-purple-700',
    desc: 'Vận may đang quay về phía bạn! Đây là thời điểm vàng để thử vận, cơ hội không đến hai lần trong đời.',
    numbers: ['10', '01', '19', '91', '55'],
  },
  {
    id: 11, numeral: 'XI', symbol: '⚖️', name: 'Công Lý', en: 'Justice',
    gradient: 'from-teal-500 to-green-700',
    desc: 'Cân bằng và sự thật. Điều gì bạn gieo hôm nay, đó là điều bạn gặt. Nỗ lực chân thành luôn được đền đáp xứng đáng.',
    numbers: ['11', '22', '33', '44', '55'],
  },
  {
    id: 12, numeral: 'XII', symbol: '🙃', name: 'Kẻ Bị Treo Ngược', en: 'The Hanged Man',
    gradient: 'from-cyan-500 to-blue-700',
    desc: 'Nhìn từ góc độ khác biệt. Đừng vội vàng, đôi khi dừng lại và suy ngẫm lại mang đến cái nhìn hoàn toàn mới mẻ.',
    numbers: ['12', '21', '39', '93', '48'],
  },
  {
    id: 13, numeral: 'XIII', symbol: '🦋', name: 'Sự Chuyển Hóa', en: 'Death',
    gradient: 'from-neutral-600 to-stone-800',
    desc: 'Kết thúc là khởi đầu mới. Đừng sợ buông bỏ những điều cũ kỹ, điều tốt đẹp hơn đang chờ ở phía trước.',
    numbers: ['13', '31', '04', '40', '34'],
  },
  {
    id: 14, numeral: 'XIV', symbol: '🌊', name: 'Điều Độ', en: 'Temperance',
    gradient: 'from-sky-400 to-blue-600',
    desc: 'Hài hòa và điều tiết. Cân bằng là chìa khóa thành công, tránh quá cực đoan trong bất cứ quyết định nào hôm nay.',
    numbers: ['14', '41', '23', '32', '05'],
  },
  {
    id: 15, numeral: 'XV', symbol: '🔗', name: 'Ác Quỷ', en: 'The Devil',
    gradient: 'from-red-800 to-rose-950',
    desc: 'Cám dỗ và ham muốn vật chất. Có thể có những cơ hội tài chính bất ngờ, nhưng hãy thận trọng và tỉnh táo khi quyết định.',
    numbers: ['15', '51', '06', '60', '26'],
  },
  {
    id: 16, numeral: 'XVI', symbol: '🌩️', name: 'Tòa Tháp', en: 'The Tower',
    gradient: 'from-zinc-600 to-neutral-800',
    desc: 'Thay đổi đột ngột và bất ngờ. Hôm nay có thể xảy ra những biến động, hãy linh hoạt thích nghi và không cứng nhắc.',
    numbers: ['16', '61', '07', '70', '34'],
  },
  {
    id: 17, numeral: 'XVII', symbol: '⭐', name: 'Ngôi Sao', en: 'The Star',
    gradient: 'from-blue-400 to-indigo-600',
    desc: 'Hy vọng và nguồn cảm hứng. Ánh sáng phía trước rất rõ ràng, đây là ngày để ước mơ lớn và hành động theo trực giác.',
    numbers: ['17', '71', '08', '80', '35'],
  },
  {
    id: 18, numeral: 'XVIII', symbol: '🌕', name: 'Mặt Trăng', en: 'The Moon',
    gradient: 'from-indigo-400 to-purple-600',
    desc: 'Tiềm thức và trực giác huyền bí. Hãy chú ý đến giấc mơ và linh cảm, chúng có thể chứa đựng thông điệp quan trọng hôm nay.',
    numbers: ['18', '81', '09', '90', '27'],
  },
  {
    id: 19, numeral: 'XIX', symbol: '☀️', name: 'Mặt Trời', en: 'The Sun',
    gradient: 'from-yellow-400 to-orange-500',
    desc: 'Thành công rực rỡ và sinh lực dồi dào! Đây là một trong những lá bài may mắn nhất, năng lượng tích cực tràn ngập hôm nay.',
    numbers: ['19', '91', '28', '82', '55'],
  },
  {
    id: 20, numeral: 'XX', symbol: '🎺', name: 'Phán Xét', en: 'Judgement',
    gradient: 'from-amber-400 to-yellow-600',
    desc: 'Thức tỉnh và đổi mới. Thời điểm để nhìn lại và bước sang trang mới với nhận thức sâu sắc và quyết định đúng đắn hơn.',
    numbers: ['20', '02', '38', '83', '29'],
  },
  {
    id: 21, numeral: 'XXI', symbol: '🌍', name: 'Thế Giới', en: 'The World',
    gradient: 'from-emerald-400 to-teal-600',
    desc: 'Hoàn thành viên mãn và thành tựu trọn vẹn. Bạn đang ở đỉnh cao của một chu kỳ, mọi nỗ lực đều được đền đáp hoàn toàn.',
    numbers: ['21', '12', '34', '43', '00'],
  },
];

export default function TarotPage() {
  const [card, setCard] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [animating, setAnimating] = useState(false);

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const drawCard = () => {
    if (animating) return;
    const newCard = TAROT_CARDS[Math.floor(Math.random() * TAROT_CARDS.length)];
    if (card) {
      setAnimating(true);
      setRevealed(false);
      setTimeout(() => {
        setCard(newCard);
        setRevealed(true);
        setAnimating(false);
      }, 650);
    } else {
      setCard(newCard);
      setRevealed(true);
    }
  };

  return (
    <div>
      <Helmet>
        <title>Bốc bài may mắn - XSMB</title>
        <meta name="description" content="Bốc bài Tarot để nhận tư vấn con số may mắn hôm nay." />
      </Helmet>

      <p className="text-xs text-gray-400 mb-5">{today}</p>

      <div className="flex flex-col items-center">
        {/* Card with flip animation */}
        <div style={{ width: 200, height: 320, perspective: '1000px' }}>
          <div
            style={{
              width: '100%',
              height: '100%',
              transition: 'transform 0.6s ease-in-out',
              transformStyle: 'preserve-3d',
              transform: revealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
              position: 'relative',
              cursor: !card ? 'pointer' : 'default',
            }}
            onClick={() => !card && drawCard()}
          >
            {/* Card Back */}
            <div
              style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
              className="absolute inset-0 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="w-full h-full bg-gradient-to-br from-gray-800 via-gray-900 to-black flex flex-col items-center justify-center border-4 border-gray-700">
                <div className="text-6xl mb-3">🎴</div>
                <div className="text-gray-400 text-xs font-bold tracking-[0.3em] uppercase">Tarot</div>
                <div className="mt-5 opacity-20 grid grid-cols-3 gap-2">
                  {[...Array(9)].map((_, i) => (
                    <div key={i} className="w-3 h-3 rounded-full bg-amber-400" />
                  ))}
                </div>
              </div>
            </div>

            {/* Card Front */}
            {card && (
              <div
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                className={`absolute inset-0 rounded-2xl shadow-2xl overflow-hidden bg-gradient-to-br ${card.gradient} flex flex-col items-center justify-center p-5 border-4 border-white/20`}
              >
                <div className="text-white/60 text-xs font-bold tracking-[0.2em] mb-2">{card.numeral}</div>
                <div className="text-6xl mb-3">{card.symbol}</div>
                <div className="text-white font-extrabold text-xl text-center leading-tight">{card.name}</div>
                <div className="text-white/70 text-xs mt-1 tracking-wide">{card.en}</div>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={drawCard}
          disabled={animating}
          className="mt-6 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-bold text-sm transition-colors shadow-lg"
        >
          {!card ? '🎴 Bốc bài hôm nay' : animating ? 'Đang bốc...' : '🔄 Bốc lại'}
        </button>

        {/* Card details */}
        {card && revealed && (
          <div className="mt-6 w-full max-w-sm space-y-3">
            <div className="text-center">
              <div className="text-xl font-extrabold text-gray-800">{card.name}</div>
              <div className="text-sm text-gray-400">{card.en} · Lá {card.numeral}</div>
            </div>

            <div className={`rounded-xl p-4 bg-gradient-to-br ${card.gradient} text-white`}>
              <p className="text-sm leading-relaxed">{card.desc}</p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Số may mắn hôm nay</div>
              <div className="flex flex-wrap gap-2 justify-center">
                {card.numbers.map(n => (
                  <span
                    key={n}
                    className="w-12 h-10 flex items-center justify-center bg-red-600 text-white rounded-lg text-sm font-bold shadow-sm"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <strong>Lưu ý:</strong> Đây là tư vấn vui mang tính giải trí. Chơi có trách nhiệm.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
