import { useState, useRef, useEffect } from "react";
import { callAI } from "./ai.js";

const LIFE_AREAS = [
  { id: "career", icon: "💼", label: "Career & Work", desc: "Job, business, professional growth" },
  { id: "finance", icon: "💰", label: "Finance & Wealth", desc: "Income, saving, investing, debt" },
  { id: "health", icon: "🏃", label: "Health & Fitness", desc: "Physical health, nutrition, exercise" },
  { id: "learning", icon: "📚", label: "Learning & Skills", desc: "Education, certifications, hobbies" },
  { id: "relationships", icon: "❤️", label: "Relationships", desc: "Family, friendships, community" },
  { id: "creative", icon: "🎨", label: "Creative & Projects", desc: "Side projects, art, content creation" },
];

const STEPS = { AREA: 0, CURRENT: 1, DESIRED: 2, CONSTRAINTS: 3, COACHING: 4, PLAN: 5 };
const STEP_LABELS = ["Focus Area", "Current State", "Desired State", "Reality Check", "Coaching", "Action Plan"];

export default function App() {
  const [step, setStep] = useState(STEPS.AREA);
  const [area, setArea] = useState(null);
  const [currentState, setCurrentState] = useState("");
  const [desiredState, setDesiredState] = useState("");
  const [constraints, setConstraints] = useState({ hoursPerWeek: "", budget: "", blockers: "" });
  const [coachingRound, setCoachingRound] = useState(0);
  const [coachingHistory, setCoachingHistory] = useState([]);
  const [userReply, setUserReply] = useState("");
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const [checked, setChecked] = useState({});
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState(""); // "", "sending", "success", "error"

  const submitEmail = async () => {
    if (!email.trim() || !email.includes("@")) return;
    setEmailStatus("sending");
    try {
      await fetch("https://script.google.com/macros/s/AKfycbyUPPhVvaT7JDrBY8U3rkBMRiYmSWnacxqX6bDrIEkNwC3GsinlEp6l0Bf3JM2YLmCO/exec", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setEmailStatus("success");
    } catch (e) {
      setEmailStatus("error");
    }
  };

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [coachingHistory, loading]);
  useEffect(() => { if (step === STEPS.COACHING && !loading) inputRef.current?.focus(); }, [step, loading, coachingHistory]);

  const buildContext = () => {
    const areaLabel = LIFE_AREAS.find((a) => a.id === area)?.label || area;
    let ctx = `LIFE AREA: ${areaLabel}\nCURRENT STATE: ${currentState}\nDESIRED STATE: ${desiredState}\n`;
    ctx += `TIME AVAILABLE: ${constraints.hoursPerWeek || "Not specified"} hours/week\n`;
    ctx += `BUDGET: ${constraints.budget || "Not specified"}\n`;
    ctx += `KNOWN BLOCKERS: ${constraints.blockers || "None mentioned"}\n`;
    if (coachingHistory.length > 0) {
      ctx += `\nCOACHING DIALOGUE:\n`;
      coachingHistory.forEach((msg) => { ctx += `${msg.role === "coach" ? "COACH" : "USER"}: ${msg.text}\n`; });
    }
    return ctx;
  };

  const aiCall = async (systemPrompt, userMessage) => {
    setError(null);
    try {
      return await callAI(systemPrompt, userMessage);
    } catch (e) {
      setError("Something went wrong connecting to the AI. Please try again.");
      throw e;
    }
  };

  const startCoaching = async () => {
    setStep(STEPS.COACHING);
    setLoading(true);
    setLoadingMsg("Analyzing your situation…");
    const ctx = buildContext();
    const sys = `You are an expert goal coach. You've just received a new client's intake form. Ask 2-3 sharp, specific clarifying questions to build a better action plan.

Focus on:
- Gaps between current and desired state needing clarification
- Hidden assumptions or unrealistic timelines
- What they've already tried (so you don't repeat failures)
- Their actual motivation/why behind the goal

Be warm but direct. Reference their specific situation. Keep response to 3-4 short paragraphs. End with 2-3 numbered questions.`;
    try {
      const response = await aiCall(sys, ctx);
      setCoachingHistory([{ role: "coach", text: response }]);
      setCoachingRound(1);
    } catch (e) {
      setCoachingHistory([{ role: "coach", text: "I had trouble connecting. Please try again in a moment." }]);
    }
    setLoading(false);
  };

  const sendReply = async () => {
    if (!userReply.trim()) return;
    const reply = userReply.trim();
    setUserReply("");
    const updated = [...coachingHistory, { role: "user", text: reply }];
    setCoachingHistory(updated);
    setLoading(true);
    const isLast = coachingRound >= 2;
    setLoadingMsg(isLast ? "Synthesizing insights…" : "Thinking…");
    const ctx = buildContext() + `\nUSER LATEST REPLY: ${reply}`;
    const sys = isLast
      ? `You are an expert goal coach. Final round. Based on everything, provide:
1. Brief synthesis of what you understand about their goal (2-3 sentences)
2. The ONE key insight or reframe from coaching
3. A clear refined, specific goal statement for the plan
Be concise and direct.`
      : `You are an expert goal coach in dialogue. Based on their latest reply:
- If it reveals new dimensions, ask 1-2 follow-ups
- If something seems unrealistic, gently challenge and reframe
- If they're vague, push for specifics
Stay warm, direct. Reference what they just said. 2-3 short paragraphs max.`;
    try {
      const response = await aiCall(sys, ctx);
      setCoachingHistory([...updated, { role: "coach", text: response }]);
      setCoachingRound((r) => r + 1);
    } catch (e) {
      setCoachingHistory([...updated, { role: "coach", text: "Lost connection. Try generating your plan or send again." }]);
    }
    setLoading(false);
  };

  const generatePlan = async () => {
    setLoading(true);
    setLoadingMsg("Building your personalized action plan…");
    setStep(STEPS.PLAN);
    const ctx = buildContext();
    const sys = `You are an expert goal coach generating a final action plan. Based on the full coaching context, generate a structured plan.

RULES:
- Tasks must be hyper-specific (exact time commitments, quantities, specific actions)
- Identify the 1-2 HIGHEST LEVERAGE actions
- Include realistic obstacles and mitigations
- Sequence tasks logically with dependencies
- 3 milestones covering weeks 1-2, weeks 3-4, month 2-3

Respond ONLY with valid JSON, no markdown, no backticks, no explanation:
{"refined_goal":"The clarified specific goal","key_insight":"Most important realization from coaching","leverage_point":"The ONE thing creating most progress","milestones":[{"title":"Milestone name","timeframe":"Week 1-2","tasks":[{"task":"Extremely specific task","is_leverage":false,"time_needed":"45 min","when":"Monday evening"}]}],"obstacles":[{"obstacle":"What might go wrong","mitigation":"How to handle it"}],"weekly_commitment":"X hours across Y sessions"}`;
    try {
      const raw = await aiCall(sys, ctx);
      let jsonStr = raw;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonStr = jsonMatch[0];
      setPlan(JSON.parse(jsonStr));
    } catch (e) {
      setPlan(null);
      setCoachingHistory((h) => [...h, { role: "coach", text: "Had trouble generating the plan. Let's try again." }]);
      setStep(STEPS.COACHING);
    }
    setLoading(false);
  };

  const reset = () => {
    setStep(STEPS.AREA); setArea(null); setCurrentState(""); setDesiredState("");
    setConstraints({ hoursPerWeek: "", budget: "", blockers: "" });
    setCoachingRound(0); setCoachingHistory([]); setUserReply("");
    setPlan(null); setLoading(false); setChecked({}); setError(null);
  };

  const toggleCheck = (mi, ti) => { const k = `${mi}-${ti}`; setChecked((p) => ({ ...p, [k]: !p[k] })); };

  return (
    <div style={S.wrapper}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif&family=DM+Sans:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{margin:0;-webkit-font-smoothing:antialiased}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes dotPulse{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        textarea,input{font-family:'DM Sans',sans-serif}
        textarea:focus,input:focus{outline:none;border-color:#C4956A!important;box-shadow:0 0 0 3px rgba(196,149,106,.12)!important}
        textarea::placeholder,input::placeholder{color:#B8A898}
        .area-card{transition:all .2s ease;cursor:pointer}
        .area-card:hover{transform:translateY(-2px);box-shadow:0 8px 28px rgba(90,70,44,.1)!important;border-color:#C4956A!important}
        .area-card.selected{border-color:#C4956A!important;background:linear-gradient(135deg,#FDF8F3,#F7EDDF)!important;box-shadow:0 0 0 3px rgba(196,149,106,.18),0 4px 16px rgba(90,70,44,.08)!important}
        .btn{transition:all .2s ease;cursor:pointer;font-family:'DM Sans',sans-serif}
        .btn:hover:not(:disabled){transform:translateY(-1px)}.btn:active:not(:disabled){transform:translateY(0)}
        .btn:disabled{opacity:.4;cursor:not-allowed}
        .btn-primary{background:linear-gradient(135deg,#5A462C,#3D2E1F);color:#fff;border:none}
        .btn-primary:hover:not(:disabled){box-shadow:0 6px 24px rgba(61,46,31,.25)}
        .coach-bubble{animation:fadeUp .4s ease both}.user-bubble{animation:fadeUp .3s ease both}
        .task-row{transition:background .15s ease;cursor:pointer}.task-row:hover{background:rgba(196,149,106,.04)}
        .checkbox{transition:all .15s ease;cursor:pointer}.checkbox:hover{border-color:#C4956A!important}
      `}</style>

      <div style={S.container}>
        <header style={S.header}>
          <div style={S.logoRow}>
            <div style={S.logoMark}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#C4956A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5"/></svg>
            </div>
            <span style={S.logoText}>Goal2Task</span>
          </div>
          <p style={{ fontSize: 14, color: "#8B7355", marginBottom: 16 }}>AI-powered goal coaching — turn ambitions into action</p>
          <div style={S.stepper}>
            {STEP_LABELS.map((label, i) => {
              const active = i === step, done = i < step;
              return (
                <div key={i} style={S.stepItem}>
                  <div style={{ ...S.stepDot, background: done ? "#C4956A" : active ? "#5A462C" : "#DDD4C6", transform: active ? "scale(1.35)" : "scale(1)" }}>
                    {done && <svg width="8" height="8" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ ...S.stepLabel, color: active ? "#3D2E1F" : done ? "#C4956A" : "#B8A898", fontWeight: active ? 600 : 400 }}>{label}</span>
                  {i < STEP_LABELS.length - 1 && <div style={S.stepLine} />}
                </div>
              );
            })}
          </div>
        </header>

        {error && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12, padding: "12px 16px", marginBottom: 16, fontSize: 14, color: "#991B1B", animation: "fadeUp .3s ease" }}>
            {error}
          </div>
        )}

        {/* STEP 0: AREA */}
        {step === STEPS.AREA && (
          <div style={{ animation: "fadeUp .4s ease both" }}>
            <div style={S.qBlock}><h2 style={S.qTitle}>What area of life do you want to focus on?</h2><p style={S.qSub}>Pick the one that feels most important right now.</p></div>
            <div style={S.areaGrid}>
              {LIFE_AREAS.map((a) => (
                <div key={a.id} className={`area-card${area === a.id ? " selected" : ""}`} onClick={() => setArea(a.id)} style={S.areaCard}>
                  <span style={S.areaIcon}>{a.icon}</span>
                  <div><div style={S.areaLabel}>{a.label}</div><div style={S.areaDesc}>{a.desc}</div></div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" disabled={!area} onClick={() => setStep(STEPS.CURRENT)} style={S.nextBtn}>Continue →</button>
          </div>
        )}

        {/* STEP 1: CURRENT STATE */}
        {step === STEPS.CURRENT && (
          <div style={{ animation: "fadeUp .4s ease both" }}>
            <div style={S.qBlock}><h2 style={S.qTitle}>Where are you right now?</h2><p style={S.qSub}>Be honest — the more specific, the better your plan.</p></div>
            <div style={S.card}>
              <label style={S.label}>My current reality</label>
              <textarea value={currentState} onChange={(e) => setCurrentState(e.target.value)}
                placeholder={area === "career" ? "e.g. I'm freelancing part-time, inconsistent income, thin pipeline..." : area === "finance" ? "e.g. Making $80K/year, $15K savings, $8K debt..." : area === "health" ? "e.g. 30 lbs overweight, sedentary, eating out often..." : "Describe your current situation — what's working, what isn't..."}
                style={S.textarea} rows={5} />
              <div style={S.charHint}>{currentState.length < 10 ? "Keep going — detail helps" : "✓ Good detail"}</div>
            </div>
            <div style={S.btnRow}>
              <button className="btn" onClick={() => setStep(STEPS.AREA)} style={S.backBtn}>← Back</button>
              <button className="btn btn-primary" disabled={currentState.trim().length < 10} onClick={() => setStep(STEPS.DESIRED)} style={S.nextBtn}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 2: DESIRED STATE */}
        {step === STEPS.DESIRED && (
          <div style={{ animation: "fadeUp .4s ease both" }}>
            <div style={S.qBlock}><h2 style={S.qTitle}>Where do you want to be?</h2><p style={S.qSub}>What does success look like in 3–6 months? Be specific — numbers, milestones, feelings.</p></div>
            <div style={S.card}>
              <label style={S.label}>My desired state</label>
              <textarea value={desiredState} onChange={(e) => setDesiredState(e.target.value)}
                placeholder="e.g. Earning $10K/month consistently, 3 active clients, confident turning down low-value work..."
                style={S.textarea} rows={5} />
              <div style={S.charHint}>{desiredState.length < 10 ? "Be specific — what does success look like?" : "✓ Clear vision"}</div>
            </div>
            <div style={S.btnRow}>
              <button className="btn" onClick={() => setStep(STEPS.CURRENT)} style={S.backBtn}>← Back</button>
              <button className="btn btn-primary" disabled={desiredState.trim().length < 10} onClick={() => setStep(STEPS.CONSTRAINTS)} style={S.nextBtn}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 3: CONSTRAINTS */}
        {step === STEPS.CONSTRAINTS && (
          <div style={{ animation: "fadeUp .4s ease both" }}>
            <div style={S.qBlock}><h2 style={S.qTitle}>Let's get realistic</h2><p style={S.qSub}>Plans fail when they ignore constraints. Let's fit this to your actual life.</p></div>
            <div style={S.card}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Hours per week you can dedicate</label>
                <input type="text" value={constraints.hoursPerWeek} onChange={(e) => setConstraints({ ...constraints, hoursPerWeek: e.target.value })} placeholder="e.g. 8-10 hours" style={S.input} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Budget available (if relevant)</label>
                <input type="text" value={constraints.budget} onChange={(e) => setConstraints({ ...constraints, budget: e.target.value })} placeholder="e.g. $200/month, or $0" style={S.input} />
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>What's blocked you before?</label>
                <textarea value={constraints.blockers} onChange={(e) => setConstraints({ ...constraints, blockers: e.target.value })} placeholder="e.g. I over-research and never launch, low energy after work..." style={S.textarea} rows={3} />
              </div>
            </div>
            <div style={S.btnRow}>
              <button className="btn" onClick={() => setStep(STEPS.DESIRED)} style={S.backBtn}>← Back</button>
              <button className="btn btn-primary" disabled={!constraints.hoursPerWeek.trim()} onClick={startCoaching} style={S.nextBtn}>Start Coaching →</button>
            </div>
          </div>
        )}

        {/* STEP 4: COACHING */}
        {step === STEPS.COACHING && (
          <div style={{ animation: "fadeUp .4s ease both" }}>
            <div style={S.qBlock}>
              <h2 style={S.qTitle}>Let's sharpen your plan</h2>
              <p style={S.qSub}>{coachingRound < 3 ? `Round ${Math.min(coachingRound, 2)} of 2 — your answers make the plan dramatically better.` : "Clear picture. Ready to build your plan."}</p>
            </div>
            <div style={S.chatContainer}>
              {coachingHistory.map((msg, i) => (
                <div key={i} className={msg.role === "coach" ? "coach-bubble" : "user-bubble"} style={msg.role === "coach" ? S.coachBubble : S.userBubble}>
                  {msg.role === "coach" && <div style={S.coachLabel}>🎯 Coach</div>}
                  {msg.role === "user" && <div style={S.userLabel}>You</div>}
                  <div style={{ ...S.bubbleText, color: msg.role === "user" ? "white" : "#3D2E1F" }}>{msg.text}</div>
                </div>
              ))}
              {loading && (
                <div className="coach-bubble" style={S.coachBubble}>
                  <div style={S.coachLabel}>🎯 Coach</div>
                  <div style={S.typingDots}><span style={{ ...S.dot, animationDelay: "0s" }} /><span style={{ ...S.dot, animationDelay: ".15s" }} /><span style={{ ...S.dot, animationDelay: ".3s" }} /></div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            {!loading && coachingRound > 0 && coachingRound < 3 && (
              <div style={S.replyBox}>
                <textarea ref={inputRef} value={userReply} onChange={(e) => setUserReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                  placeholder="Answer the questions above… be specific" style={{ ...S.textarea, minHeight: 80 }} rows={3} />
                <div style={S.replyCtrls}>
                  <span style={S.replyHint}>Enter to send</span>
                  <button className="btn btn-primary" onClick={sendReply} disabled={!userReply.trim()} style={{ ...S.nextBtn, flex: "none", padding: "10px 20px", fontSize: 14 }}>Send →</button>
                </div>
              </div>
            )}
            {!loading && coachingRound >= 2 && (
              <button className="btn btn-primary" onClick={generatePlan} style={{ ...S.nextBtn, marginTop: 16 }}>✨ Generate My Action Plan</button>
            )}
            {!loading && coachingRound >= 1 && coachingRound < 3 && (
              <button className="btn" onClick={generatePlan} style={{ ...S.backBtn, marginTop: 8, width: "100%", textAlign: "center" }}>Skip — generate plan now</button>
            )}
          </div>
        )}

        {/* STEP 5: PLAN */}
        {step === STEPS.PLAN && (
          <div>
            {loading && (
              <div style={{ ...S.card, textAlign: "center", padding: "48px 32px", animation: "fadeIn .3s ease" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #EDE3D8", borderTopColor: "#C4956A", animation: "spin .8s linear infinite", margin: "0 auto 16px" }} />
                <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 20, color: "#3D2E1F", marginBottom: 12 }}>{loadingMsg}</p>
                <div style={{ width: 180, height: 4, background: "#EDE3D8", borderRadius: 2, overflow: "hidden", margin: "0 auto" }}><div style={{ height: "100%", background: "linear-gradient(90deg, #C4956A, #DEB887, #C4956A)", backgroundSize: "200% 100%", animation: "shimmer 1.5s ease infinite" }} /></div>
              </div>
            )}
            {!loading && plan && (
              <div style={{ animation: "fadeUp .5s ease both" }}>
                <div style={{ ...S.card, marginBottom: 16, borderLeft: "4px solid #C4956A" }}>
                  <div><div style={S.planLabel}>🎯 REFINED GOAL</div><p style={S.planHighlight}>{plan.refined_goal}</p></div>
                  {plan.key_insight && <div style={{ marginTop: 16 }}><div style={S.planLabel}>💡 KEY INSIGHT</div><p style={S.planBody}>{plan.key_insight}</p></div>}
                  {plan.leverage_point && <div style={{ marginTop: 16 }}><div style={S.planLabel}>⚡ HIGHEST LEVERAGE ACTION</div><p style={{ ...S.planBody, fontWeight: 600, color: "#5A462C" }}>{plan.leverage_point}</p></div>}
                  {plan.weekly_commitment && <div style={S.commitBadge}>🕐 {plan.weekly_commitment}</div>}
                </div>
                {plan.milestones?.map((ms, mi) => (
                  <div key={mi} style={{ ...S.card, marginBottom: 14, animation: `fadeUp .4s ease ${mi * .1}s both` }}>
                    <div style={{ marginBottom: 14 }}>
                      <span style={S.msBadge}>{ms.timeframe}</span>
                      <h3 style={S.msTitle}>{ms.title}</h3>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {ms.tasks?.map((task, ti) => {
                        const k = `${mi}-${ti}`, done = checked[k];
                        return (
                          <div key={ti} className="task-row" onClick={() => toggleCheck(mi, ti)} style={S.taskRow}>
                            <div className="checkbox" style={{ ...S.chk, background: done ? "#5A462C" : "white", borderColor: done ? "#5A462C" : "#D4C5B5" }}>
                              {done && <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontSize: 14.5, color: "#3D2E1F", lineHeight: 1.5, textDecoration: done ? "line-through" : "none", opacity: done ? .5 : 1 }}>
                                {task.is_leverage && <span style={S.levTag}>⚡ HIGH LEVERAGE</span>}
                                {task.task}
                              </p>
                              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                                {task.time_needed && <span style={S.metaChip}>⏱ {task.time_needed}</span>}
                                {task.when && <span style={S.metaChip}>📅 {task.when}</span>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={S.mProg}>
                      <div style={S.mProgBg}><div style={{ ...S.mProgFill, width: `${(ms.tasks?.filter((_, ti) => checked[`${mi}-${ti}`]).length / (ms.tasks?.length || 1)) * 100}%` }} /></div>
                      <span style={S.mProgText}>{ms.tasks?.filter((_, ti) => checked[`${mi}-${ti}`]).length}/{ms.tasks?.length}</span>
                    </div>
                  </div>
                ))}
                {plan.obstacles?.length > 0 && (
                  <div style={{ ...S.card, marginBottom: 14, background: "#FFFBF5", borderLeft: "4px solid #E8B86D" }}>
                    <div style={S.planLabel}>🛡️ OBSTACLES & MITIGATIONS</div>
                    {plan.obstacles.map((obs, i) => (
                      <div key={i} style={{ padding: "10px 0", borderBottom: i < plan.obstacles.length - 1 ? "1px solid rgba(232,184,109,.15)" : "none" }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "#92400E", marginBottom: 3 }}>⚠️ {obs.obstacle}</div>
                        <div style={{ fontSize: 13.5, color: "#5A462C", lineHeight: 1.5, paddingLeft: 22 }}>→ {obs.mitigation}</div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Lead Capture CTA */}
                <div style={{ ...S.card, marginBottom: 14, background: "linear-gradient(135deg, #3D2E1F, #5A462C)", border: "none", textAlign: "center", padding: "32px 24px", animation: "fadeUp .5s ease .4s both" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🚀</div>
                  <h3 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 22, color: "white", marginBottom: 8, lineHeight: 1.3 }}>I built this app in 1 hour.<br />I don't write code.</h3>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,.7)", lineHeight: 1.6, marginBottom: 20, maxWidth: 420, margin: "0 auto 20px" }}>
                    Want to learn how to build and launch your own AI-powered apps — no coding required? Sign up and I'll show you exactly how.
                  </p>
                  {emailStatus === "success" ? (
                    <div style={{ background: "rgba(255,255,255,.12)", borderRadius: 12, padding: "14px 20px", color: "#DEB887", fontWeight: 600, fontSize: 15 }}>
                      ✓ You're in! Check your inbox soon.
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, maxWidth: 400, margin: "0 auto" }}>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") submitEmail(); }}
                        placeholder="Enter your email"
                        style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.1)", color: "white", fontSize: 14, fontFamily: "'DM Sans', sans-serif", outline: "none" }}
                      />
                      <button
                        onClick={submitEmail}
                        disabled={emailStatus === "sending" || !email.includes("@")}
                        style={{ padding: "12px 20px", borderRadius: 10, border: "none", background: "#C4956A", color: "white", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", whiteSpace: "nowrap", opacity: emailStatus === "sending" || !email.includes("@") ? 0.5 : 1 }}
                      >
                        {emailStatus === "sending" ? "..." : "Sign Up"}
                      </button>
                    </div>
                  )}
                  {emailStatus === "error" && (
                    <p style={{ color: "#F87171", fontSize: 13, marginTop: 8 }}>Something went wrong. Try again.</p>
                  )}
                </div>

                <button className="btn" onClick={reset} style={{ ...S.backBtn, width: "100%", textAlign: "center", marginTop: 8 }}>← Start Over with New Goals</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  wrapper: { minHeight: "100vh", background: "linear-gradient(170deg, #FDFAF5 0%, #F5EDE2 50%, #EDE3D5 100%)", fontFamily: "'DM Sans', sans-serif", padding: "32px 16px 80px" },
  container: { maxWidth: 620, margin: "0 auto" },
  header: { textAlign: "center", marginBottom: 24, animation: "fadeUp .5s ease both" },
  logoRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 },
  logoMark: { width: 40, height: 40, borderRadius: 11, background: "white", border: "1.5px solid rgba(196,149,106,.2)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,.04)" },
  logoText: { fontFamily: "'Instrument Serif', serif", fontSize: 28, color: "#3D2E1F", letterSpacing: "-.01em" },
  stepper: { display: "flex", justifyContent: "center", gap: 4, flexWrap: "wrap", alignItems: "center" },
  stepItem: { display: "flex", alignItems: "center", gap: 5, padding: "4px 0" },
  stepDot: { width: 10, height: 10, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all .3s ease", flexShrink: 0 },
  stepLabel: { fontSize: 11, letterSpacing: ".02em", transition: "all .3s ease", whiteSpace: "nowrap" },
  stepLine: { width: 12, height: 1, background: "#DDD4C6", marginLeft: 4 },
  qBlock: { marginBottom: 20 },
  qTitle: { fontFamily: "'Instrument Serif', serif", fontSize: 26, color: "#3D2E1F", marginBottom: 6, lineHeight: 1.2 },
  qSub: { fontSize: 14.5, color: "#8B7355", lineHeight: 1.55 },
  card: { background: "white", borderRadius: 16, padding: "24px 22px", boxShadow: "0 2px 16px rgba(80,60,30,.05)", border: "1px solid rgba(196,149,106,.1)" },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#5A462C", marginBottom: 6, letterSpacing: ".01em" },
  textarea: { width: "100%", border: "1.5px solid #E8DFD2", borderRadius: 10, padding: "12px 14px", fontSize: 14.5, lineHeight: 1.55, color: "#3D2E1F", background: "#FDFAF7", resize: "vertical", fontFamily: "'DM Sans', sans-serif", transition: "border-color .2s, box-shadow .2s" },
  input: { width: "100%", border: "1.5px solid #E8DFD2", borderRadius: 10, padding: "11px 14px", fontSize: 14.5, color: "#3D2E1F", background: "#FDFAF7", transition: "border-color .2s, box-shadow .2s" },
  fieldGroup: { marginBottom: 18 },
  charHint: { fontSize: 12, color: "#B8A898", marginTop: 6 },
  btnRow: { display: "flex", gap: 10, marginTop: 20 },
  nextBtn: { flex: 1, padding: "13px 20px", borderRadius: 12, fontSize: 15, fontWeight: 600 },
  backBtn: { padding: "13px 20px", borderRadius: 12, fontSize: 14, fontWeight: 500, background: "white", border: "1.5px solid #DDD4C6", color: "#5A462C", cursor: "pointer", fontFamily: "'DM Sans', sans-serif" },
  areaGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 },
  areaCard: { background: "white", borderRadius: 14, padding: "16px 14px", border: "1.5px solid #E8DFD2", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 4px rgba(0,0,0,.03)" },
  areaIcon: { fontSize: 26, flexShrink: 0 },
  areaLabel: { fontSize: 14, fontWeight: 600, color: "#3D2E1F", marginBottom: 2 },
  areaDesc: { fontSize: 12, color: "#A8977F", lineHeight: 1.35 },
  chatContainer: { maxHeight: 440, overflowY: "auto", marginBottom: 16, padding: "4px 0" },
  coachBubble: { background: "white", borderRadius: "4px 16px 16px 16px", padding: "14px 18px", marginBottom: 12, border: "1px solid rgba(196,149,106,.12)", boxShadow: "0 1px 6px rgba(0,0,0,.03)", maxWidth: "92%" },
  userBubble: { background: "linear-gradient(135deg, #5A462C, #3D2E1F)", borderRadius: "16px 4px 16px 16px", padding: "14px 18px", marginBottom: 12, marginLeft: "auto", maxWidth: "85%" },
  coachLabel: { fontSize: 11, fontWeight: 700, color: "#C4956A", marginBottom: 6, letterSpacing: ".04em", textTransform: "uppercase" },
  userLabel: { fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.6)", marginBottom: 6, letterSpacing: ".04em", textTransform: "uppercase" },
  bubbleText: { fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap" },
  typingDots: { display: "flex", gap: 5, padding: "4px 0" },
  dot: { width: 7, height: 7, borderRadius: "50%", background: "#C4956A", animation: "dotPulse 1s ease-in-out infinite" },
  replyBox: { background: "white", borderRadius: 14, padding: 16, border: "1.5px solid #E8DFD2" },
  replyCtrls: { display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  replyHint: { fontSize: 12, color: "#B8A898" },
  planLabel: { fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#C4956A", marginBottom: 6 },
  planHighlight: { fontFamily: "'Instrument Serif', serif", fontSize: 20, color: "#3D2E1F", lineHeight: 1.4 },
  planBody: { fontSize: 14.5, color: "#5A462C", lineHeight: 1.6 },
  commitBadge: { display: "inline-block", background: "#F5EDE2", borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "#5A462C", marginTop: 16 },
  msBadge: { display: "inline-block", fontSize: 11, fontWeight: 700, color: "white", background: "#5A462C", borderRadius: 6, padding: "3px 10px", letterSpacing: ".03em", marginBottom: 6 },
  msTitle: { fontFamily: "'Instrument Serif', serif", fontSize: 19, color: "#3D2E1F" },
  taskRow: { display: "flex", alignItems: "flex-start", gap: 11, padding: "10px 6px", borderRadius: 8 },
  chk: { width: 20, height: 20, borderRadius: 6, border: "2px solid", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 2, transition: "all .15s ease" },
  levTag: { display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: ".04em", color: "#92400E", background: "#FEF3C7", borderRadius: 4, padding: "1px 6px", marginRight: 6, verticalAlign: "middle" },
  metaChip: { fontSize: 12, color: "#8B7355" },
  mProg: { display: "flex", alignItems: "center", gap: 10, marginTop: 14, paddingTop: 12, borderTop: "1px solid #F0E8DD" },
  mProgBg: { flex: 1, height: 5, background: "#F0E8DD", borderRadius: 3, overflow: "hidden" },
  mProgFill: { height: "100%", background: "linear-gradient(90deg, #5A462C, #C4956A)", borderRadius: 3, transition: "width .3s ease" },
  mProgText: { fontSize: 12, fontWeight: 600, color: "#B8A898", flexShrink: 0 },
};
