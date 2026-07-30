import axios from "axios";
import { apiUrl } from "./base";

export async function getProjects() {
  const res = await axios.get(apiUrl("/projects"));
  return res.data;
}
