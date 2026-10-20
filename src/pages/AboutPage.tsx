import { Link } from 'react-router-dom'
import { IconBack } from '../components/icons'
import { BRAND_SPIRIT, TEAM, TEAM_SUMMARY, TEAM_TAGLINE } from '../features/about/about'

/** /about：曦語的名字、品牌精神與團隊。唯讀的安靜頁面，返回「我的」 */
export default function AboutPage() {
  return (
    <div className="page about-page">
      <header className="topbar">
        <Link className="btn ghost back" to="/me">
          <IconBack /> 我的
        </Link>
        <h1 className="topbar-title">關於曦語</h1>
      </header>

      <section className="about-section" aria-labelledby="about-what">
        <h2 id="about-what">曦語是什麼</h2>
        <p className="about-lead">
          「曦」是清晨第一道陽光，音近「細語」：白天走到樹下，輕聲說心事。
        </p>
        <p className="about-pinyin">
          <span lang="zh-Latn">xī yǔ</span>・曦光細語，蘊憩身心。
        </p>
        <p className="muted small about-en">Whisper Trees 有雙向的含義：</p>
        <ul className="about-twoway">
          <li>
            <strong>Trees that whisper</strong>
            <span>樹會低語：我們聆聽樹的聲音</span>
          </li>
          <li>
            <strong>Trees you whisper to</strong>
            <span>對樹低語：樹洞承載我們的傾訴</span>
          </li>
        </ul>
      </section>

      <section className="about-section" aria-labelledby="about-spirit">
        <h2 id="about-spirit">品牌精神</h2>
        <ul className="about-spirit">
          {BRAND_SPIRIT.map((b) => (
            <li key={b.name} className="card">
              <strong>{b.name}</strong>
              <span>{b.line}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-section" aria-labelledby="about-team">
        <h2 id="about-team">團隊</h2>
        <p className="about-team-sum" data-testid="team-summary">
          {TEAM_SUMMARY}
        </p>
        <p className="muted small">{TEAM_TAGLINE}</p>
        <ul className="team-list" data-testid="team-list">
          {TEAM.map((m) => (
            <li key={m.name} className="card team-card" data-testid="team-member">
              <span className="team-badge" aria-hidden="true">
                {m.initial}
              </span>
              <div className="team-body">
                <h3 className="team-name">{m.name}</h3>
                <p className="team-title">{m.title}</p>
                <p className="team-role">{m.role}</p>
                <p className="muted small team-skills">{m.skills}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-section" aria-labelledby="about-hack">
        <h2 id="about-hack">這個 Demo</h2>
        <p>台北市政 Debug 松・題目 #1 把樹種回來。</p>
        <p className="muted small">
          樹籍資料是臺北市政府的開放資料，其餘（光點、微光人數、許願進度…）是示範用的模擬資料，畫面上都標了「模擬」。詳細的來源與授權說明在
          <Link className="about-link" to="/me">
            「我的」
          </Link>
          最下面的「設定與其他」。
        </p>
      </section>

      <section className="about-next" aria-label="接下來">
        <p className="about-lead">看完了，就去樹旁邊坐一下吧。</p>
        <div className="about-next-actions">
          <Link className="btn primary" to="/scan" data-testid="about-scan">
            去掃一棵樹
          </Link>
          <Link className="btn" to="/" data-testid="about-map">
            回地圖
          </Link>
        </div>
      </section>
    </div>
  )
}
