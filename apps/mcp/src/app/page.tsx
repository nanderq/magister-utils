import { headers } from "next/headers";
import { ArrowRight, CalendarDays, Check, Link2, LogIn } from "lucide-react";
import Link from "next/link";

import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const destination = session ? "/dashboard" : "/auth/signin";

  return <main className="landing">
    <div className="landing-shell">
      <header className="landing-nav">
        <Link className="landing-nav-link" href={destination}>{session ? "Dashboard" : "Sign in"}<ArrowRight aria-hidden="true" /></Link>
      </header>

      <section className="landing-hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <h1 id="hero-title">Your school data.<br />Ready to talk.</h1>
          <p className="landing-intro">A secure, read-only bridge between Magister and your AI assistant. Ask about schedules, grades, assignments, and more.</p>
          <Link className="landing-button landing-button-dark" href={destination}>Connect Magister <ArrowRight aria-hidden="true" /></Link>
        </div>

        <div className="product-card" aria-label="Example weekly schedule from Magister MCP">
          <div className="schedule-head">
            <div><CalendarDays aria-hidden="true" /><span><b>Your week</b><small>10 - 14 June</small></span></div>
            <span className="schedule-count">24 lessons</span>
          </div>
          <div className="schedule-scroll">
            <div className="schedule-table">
              <div className="schedule-corner" />
              <div className="schedule-day"><b>MON</b><span>10</span></div><div className="schedule-day"><b>TUE</b><span>11</span></div><div className="schedule-day active"><b>WED</b><span>12</span></div><div className="schedule-day"><b>THU</b><span>13</span></div><div className="schedule-day"><b>FRI</b><span>14</span></div>
              <div className="schedule-time">09:00</div><div className="lesson">English<small>B1.12</small></div><div className="lesson">Math<small>A2.04</small></div><div /><div className="lesson test">Biology<small>Test</small></div><div className="lesson">History<small>C1.08</small></div>
              <div className="schedule-time">10:00</div><div className="lesson">Physics<small>Lab 2</small></div><div /><div className="lesson">Dutch<small>B2.11</small></div><div className="lesson">Math<small>A2.04</small></div><div />
              <div className="schedule-time">11:00</div><div /><div className="lesson">Geography<small>C1.03</small></div><div className="lesson">English<small>B1.12</small></div><div /><div className="lesson">Art<small>Studio</small></div>
              <div className="schedule-time">13:00</div><div className="lesson">Computer science<small>D0.06</small></div><div className="lesson">PE<small>Gym</small></div><div /><div className="lesson">History<small>C1.08</small></div><div className="lesson">Mentor<small>B0.02</small></div>
            </div>
          </div>
          <div className="schedule-foot"><span><i /> Synced with Magister</span><b>Updated just now</b></div>
        </div>
      </section>

      <section className="how-section" aria-labelledby="how-title">
        <div className="section-heading">
          <h2 id="how-title">Three steps.<br />One connection.</h2>
        </div>
        <div className="steps-grid">
          <article><span className="step-number">01</span><div className="step-icon"><LogIn aria-hidden="true" /></div><h3>Sign in</h3><p>Use Google to create your secure Magister MCP account.</p></article>
          <article><span className="step-number">02</span><div className="step-icon"><Link2 aria-hidden="true" /></div><h3>Connect</h3><p>Link Magister through its official login flow. Your password is never shared.</p></article>
          <article><span className="step-number">03</span><div className="step-icon"><Check aria-hidden="true" /></div><h3>Start asking</h3><p>Add your private endpoint to any MCP-compatible assistant.</p></article>
        </div>
      </section>

      <section className="landing-cta" aria-labelledby="cta-title">
        <h2 id="cta-title">Make your school day<br />easier to understand.</h2>
        <p>Connect once. Ask whenever you need clarity.</p>
        <Link className="landing-button landing-button-light" href={destination}>{session ? "Open dashboard" : "Get started"}<ArrowRight aria-hidden="true" /></Link>
      </section>
    </div>
  </main>;
}
