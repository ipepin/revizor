import axios from "axios";

export async function getProjects() {
  const res = await axios.get("http://localhost:8000/projects");
  return res.data;
}
