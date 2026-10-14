
"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");
  const [language, setLanguage] = useState("Telugu");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function handleImage(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      setError("Please upload a JPG, PNG, or WEBP image.");
      e.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Please choose an image smaller than 5 MB.");
      e.target.value = "";
      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));
    setResult("");
    setError("");
    setCopied(false);
  }

  async function generateListing() {
    if (!image) {
      setError("Please upload a product photo first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult("");
    setCopied(false);

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const value = reader.result;

          if (typeof value !== "string") {
            reject(new Error("Unable to read the image."));
            return;
          }

          resolve(value.split(",")[1]);
        };

        reader.onerror = () => reject(new Error("Unable to read the image."));
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

      if (!data.text) {
        throw new Error("The AI returned an empty listing. Please try again.");
      }

      setResult(data.text);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copyListing() {
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setError("");
    } catch {
      setError(
        "Copying was blocked by your browser. Please select and copy the listing manually."
      );
    }
  }

  return (
    <main className="page">
      <nav className="navbar">
        <a className="brand" href="#">🧵 ArtisanAI</a>
        <span className="nav-tag">AI for Local Artisans</span>
      </nav>

      <section className="hero">
        <div className="badge">✦ YOUR CRAFT, OUR AI</div>
        <h1>
          Take your craft
          <br />
          <span>to the world.</span>
        </h1>
        <p>
          Turn a product photo into a marketplace-ready listing.
          Create descriptions in your language and help your products
          reach more customers.
        </p>
      </section>

      <section className="workspace">
        <div className="form-card">
          <div className="section-heading">
            <span className="step">01</span>
            <div>
              <h2>Show us your craft</h2>
              <p>Upload a photo of your product.</p>
            </div>
          </div>

          <label className="upload-box">
            {preview ? (
              <img src={preview} alt="Uploaded product preview" />
            ) : (
              <div className="upload-placeholder">
                <span className="upload-icon">↑</span>
                <strong>Upload product photo</strong>
                <span>JPG, PNG or WEBP · Maximum 5 MB</span>
              </div>
            )}

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
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

          {error && (
            <p className="error" role="alert">{error}</p>
          )}

          <p className="privacy-note">
            🔒 Your image is sent to the AI service to generate a listing.
          </p>
        </div>

        <div className="result-card">
          <div className="section-heading">
            <span className="step">02</span>
            <div>
              <h2>Your product story</h2>
              <p>AI-generated content, ready for review.</p>
            </div>
          </div>

          {result ? (
            <div className="result-content">
              <pre>{result}</pre>
              <button className="copy-button" onClick={copyListing}>
                {copied ? "✓ Copied successfully!" : "Copy listing"}
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
                <span>✓ Estimated product pricing</span>
                <span>✓ Marketplace-ready keywords</span>
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

