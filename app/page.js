"use client";

import { useState } from "react";

export default function Home() {
const [image, setImage] = useState(null);
const [preview, setPreview] = useState("");
const [language, setLanguage] = useState("Telugu");
const [result, setResult] = useState("");
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

function handleImage(e) {
const file = e.target.files?.[0];
if (!file) return;


if (!file.type.startsWith("image/")) {
  setError("Please upload an image file.");
  return;
}

setImage(file);
setPreview(URL.createObjectURL(file));
setResult("");
setError("");

}

async function generateListing() {
if (!image) {
setError("Please upload a photo of your handmade product first.");
return;
}

setLoading(true);
setError("");
setResult("");

try {
  const reader = new FileReader();

  const base64 = await new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(image);
  });

  const response = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: base64,
      mimeType: image.type,
      language,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Unable to generate the listing.");
  }

  setResult(data.text);
} catch (err) {
  setError(err.message || "Something went wrong. Please try again.");
} finally {
  setLoading(false);
}

}

return ( <main className="page"> <nav className="navbar"> <a className="brand" href="#">🧵 ArtisanAI</a> <span className="nav-tag">AI for Local Artisans</span> </nav>

  <section className="hero">
    <div className="badge">✦ YOUR CRAFT, OUR AI</div>
    <h1>
      Take your craft
      <br />
      <span>to the world.</span>
    </h1>
    <p>
      Turn a simple product photo into a marketplace-ready listing.
      Create descriptions in your language and help your handmade
      products reach more customers.
    </p>
  </section>

  <section className="workspace">
    <div className="form-card">
      <div className="section-heading">
        <span className="step">01</span>
        <div>
          <h2>Show us your craft</h2>
          <p>Upload a photo of your handmade product.</p>
        </div>
      </div>

      <label className="upload-box">
        {preview ? (
          <img src={preview} alt="Your uploaded product" />
        ) : (
          <div className="upload-placeholder">
            <span className="upload-icon">↑</span>
            <strong>Upload product photo</strong>
            <span>Choose a JPG, PNG or WEBP image</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={handleImage}
          hidden
        />
      </label>

      <div className="field">
        <label htmlFor="language">Listing language</label>
        <select
          id="language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option>Telugu</option>
          <option>English</option>
          <option>Hindi</option>
        </select>
      </div>

      <button
        className="generate-button"
        onClick={generateListing}
        disabled={loading}
      >
        {loading ? "Creating your listing..." : "✦ Generate with AI"}
      </button>

      {error && <p className="error">{error}</p>}

      <p className="privacy-note">
        🔒 Your product image is used to generate your listing.
      </p>
    </div>

    <div className="result-card">
      <div className="section-heading">
        <span className="step">02</span>
        <div>
          <h2>Your product story</h2>
          <p>AI-generated content, ready for you to review.</p>
        </div>
      </div>

      {result ? (
        <div className="result-content">
          <pre>{result}</pre>
          <button
            className="copy-button"
            onClick={() => navigator.clipboard.writeText(result)}
          >
            Copy listing
          </button>
        </div>
      ) : (
        <div className="empty-result">
          <div className="empty-icon">✧</div>
          <h3>Your next customer starts here.</h3>
          <p>
            Upload your product photo and let AI help tell its story
            in your chosen language.
          </p>
          <div className="feature-list">
            <span>✓ Product description</span>
            <span>✓ Regional-language listing</span>
            <span>✓ Marketplace-ready content</span>
          </div>
        </div>
      )}
    </div>
  </section>

  <footer>
    <span>ArtisanAI © 2026</span>
    <span>Empowering local craftsmanship with AI ✦</span>
  </footer>
</main>
);
}
