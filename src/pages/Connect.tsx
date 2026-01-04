import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

// This page redirects to the unified PublicProfile page at /u/:userId
// Both /connect/:id and /u/:userId now use the same component
export default function Connect() {
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      // Redirect to the unified public profile URL
      navigate(`/u/${id}`, { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, [id, navigate]);

  return null;
}
