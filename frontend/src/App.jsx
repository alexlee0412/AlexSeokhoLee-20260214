import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useState } from "react";
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function useNavState() {
  const location = useLocation();
  return location.state || {};
}

function Card({ title, children }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 16,
      }}
    >
      {title && <h3 style={{ marginTop: 0 }}>{title}</h3>}
      {children}
    </div>
  );
}

function Badge({ children }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        background: "#f3f4f6",
        border: "1px solid #e5e7eb",
        fontSize: 12,
      }}
    >
      {children}
    </span>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 12, color: "#374151" }}>{label}</div>
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          padding: 10,
          borderRadius: 10,
          border: "1px solid #e5e7eb",
          outline: "none",
        }}
      />
    </label>
  );
}

// Profile
function ProfilePage() {
  const nav = useNavigate();

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [meds, setMeds] = useState("");
  const [concerns, setConcerns] = useState("");
  const [budget, setBudget] = useState("");
  const [currentSupplements, setCurrentSupplements] = useState("");

  const next = () => {
    const profile = {
      age: Number(age || 0),
      gender,
      meds,
      concerns,
      budget,
      currentSupplements,
    };
    nav("/compare", { state: { profile } });
  };

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "system-ui",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <h2 style={{ marginBottom: 8 }}>Omega-3 Decision Helper (MVP)</h2>
      <p style={{ marginTop: 0, color: "#4b5563" }}>
        Step 1/3 — Tell us about you. We’ll personalize the recommendation.
      </p>

      <div style={{ display: "grid", gap: 12, marginBottom: 12 }}>
        <Card title="User profile">
          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <Field
                label="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g., 24"
              />
              <Field
                label="Gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                placeholder="e.g., M/F"
              />
            </div>
            <Field
              label="Current meds (optional)"
              value={meds}
              onChange={(e) => setMeds(e.target.value)}
              placeholder="e.g., blood thinner"
            />
            <Field
              label="Health concerns"
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              placeholder="e.g., eyes, fatigue, joints"
            />
            <Field
              label="Budget (optional)"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g., $25/month"
            />
            <Field
              label="Current supplements (optional)"
              value={currentSupplements}
              onChange={(e) => setCurrentSupplements(e.target.value)}
              placeholder="e.g., multivitamin"
            />
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 10,
              alignItems: "center",
            }}
          >
            <button
              onClick={next}
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                border: "1px solid #111827",
                background: "#111827",
                color: "white",
                cursor: "pointer",
              }}
            >
              Next → Compare
            </button>
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              No DB used. Profile is passed client-side for MVP.
            </span>
          </div>
        </Card>

        <Card title="What this MVP does">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge>Quant metrics: price/1000mg</Badge>
            <Badge>EPA/DHA per serving</Badge>
            <Badge>GPT personalization</Badge>
          </div>
        </Card>
      </div>
    </div>
  );
}

// Compare
function ComparePage() {
  const nav = useNavigate();
  const { profile } = useNavState();

  const [productA, setProductA] = useState("Sports Research");
  const [productB, setProductB] = useState("NOW Foods");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const run = async () => {
    if (!profile) {
      setError("Profile missing. Go back and fill Step 1.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/compare`, {
        profile,
        productA,
        productB,
      });
      nav("/result", { state: { result: res.data } });
    } catch (e) {
      setError(JSON.stringify(e?.response?.data || { message: e.message }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "system-ui",
        maxWidth: 900,
        margin: "0 auto",
      }}
    >
      <p style={{ marginTop: 0, color: "#4b5563" }}>
        Step 2/3 — Choose products to compare.
      </p>

      <div
        style={{
          background: "#fff3cd",
          padding: 12,
          borderRadius: 12,
          border: "1px solid #fde68a",
          marginBottom: 12,
        }}
      >
        ⚠️ Beta: Only <b>Sports Research</b> & <b>NOW Foods</b> are supported.
      </div>

      <Card title="A vs B">
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Field
            label="Product A"
            value={productA}
            onChange={(e) => setProductA(e.target.value)}
          />
          <div style={{ marginTop: 18 }}>vs</div>
          <Field
            label="Product B"
            value={productB}
            onChange={(e) => setProductB(e.target.value)}
          />
          <button
            onClick={run}
            disabled={loading}
            style={{
              marginTop: 18,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #111827",
              background: loading ? "#374151" : "#111827",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Comparing..." : "Compare"}
          </button>
        </div>

        {error && (
          <pre
            style={{
              marginTop: 12,
              whiteSpace: "pre-wrap",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              padding: 12,
              borderRadius: 12,
            }}
          >
            {error}
          </pre>
        )}
      </Card>
    </div>
  );
}

// Result
function fmt(n, digits = 2) {
  if (n === null || n === undefined) return "-";
  if (typeof n !== "number" || Number.isNaN(n)) return "-";
  return n.toFixed(digits);
}

function ResultPage() {
  const { result } = useNavState();

  if (!result) {
    return (
      <div style={{ padding: 20, fontFamily: "system-ui" }}>
        Result missing. Please run compare again.
      </div>
    );
  }

  const winner = result.gptJson?.winner || result.winnerFromScoreModel || "(see raw)";
  const reason = result.gptJson?.reason || "";
  const valueSummary = result.gptJson?.valueSummary || [];
  const cautions = result.gptJson?.cautions || [];

  const products = result.products || {};
  const keys = Object.keys(products);

  return (
    <div style={{ padding: 20, fontFamily: "system-ui", maxWidth: 1000, margin: "0 auto" }}>
      <p style={{ marginTop: 0, color: "#4b5563" }}>Step 3/3 — Recommendation</p>

      <div style={{ display: "grid", gap: 12 }}>

        <Card title="🏆 Recommended">
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{winner}</div>

            {result.usedFallback ? (
              <Badge>Fallback Mode</Badge>
            ) : (
              <Badge>Generated by OpenAI</Badge>
            )}
          </div>

          {reason && <p style={{ marginBottom: 0 }}>{reason}</p>}

          {result.usedFallback && (
            <p style={{ fontSize: 12, color: "#b91c1c" }}>
              OpenAI API 호출이 실패하여 정량 기반 모델로 추천이 생성되었습니다.
            </p>
          )}
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {keys.map((k) => {
            const p = products[k];
            return (
              <Card key={k} title={k}>
                <div style={{ display: "grid", gap: 6, fontSize: 14 }}>
                  <div><b>Price:</b> {p.price} {p.currency}</div>
                  <div><b>Count:</b> {p.softgels} softgels</div>
                  <div><b>Serving:</b> {p.servingSoftgels} softgels</div>
                  <div><b>Omega-3/serving:</b> {p.omega3PerServingMg} mg</div>
                  <div><b>EPA/serving:</b> {p.epaPerServingMg} mg</div>
                  <div><b>DHA/serving:</b> {p.dhaPerServingMg} mg</div>
                  <hr style={{ border: "none", borderTop: "1px solid #e5e7eb" }} />
                  <div><b>Servings/bottle:</b> {fmt(p.servingsPerBottle, 0)}</div>
                  <div><b>Total omega-3/bottle:</b> {fmt(p.totalOmega3MgPerBottle, 0)} mg</div>
                  <div><b>$/softgel:</b> {fmt(p.pricePerSoftgel, 4)}</div>
                  <div><b>$/1000mg omega-3:</b> {fmt(p.pricePer1000mgOmega3, 4)}</div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card title="Why (Value + Potency)">
          <ul style={{ marginTop: 0 }}>
            {valueSummary.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Card>

        <Card title="Cautions">
          <ul style={{ marginTop: 0 }}>
            {cautions.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
        </Card>

        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {result.betaNotice || ""}
        </div>

      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProfilePage />} />
      <Route path="/compare" element={<ComparePage />} />
      <Route path="/result" element={<ResultPage />} />
    </Routes>
  );
}
