import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/authApi";
import { useAuthStore } from "../store/authStore";

const RegisterPage = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = await register(formData);
      setAuth(data);
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError.response?.data?.message || "Unable to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <p className="eyebrow">Study Room</p>
        <h1>Create your account</h1>
        <p className="subcopy">Set up your workspace and join study rooms.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input name="name" type="text" value={formData.name} onChange={handleChange} placeholder="Your name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="you@example.com" required />
          </label>
          <label>
            Password
            <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required minLength="6" />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="form-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;