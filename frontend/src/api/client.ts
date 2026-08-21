import axios from "axios";
import type { GeneratorFormData } from "../types/problem";
import type { FeedbackPayload, FeedbackEntry } from "../types/feedback";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api/`,
});

export const getSets = async () => {
  const response = await api.get("sets/");
  return response.data;
};

export const generateSet = async (data: {
  setName: string;
  topic: string;
  difficulty: string;
  prepLevel: string;
  formData: GeneratorFormData;
}) => {
  const response = await api.post("generate/", data);
  return response.data;
};

export const editQuestionWithAi = async (id: string, prompt: string) => {
  const response = await api.post(`questions/${id}/edit/`, { prompt });
  return response.data;
};

export const editSetWithAi = async (setId: string, prompt: string) => {
  const response = await api.post(`sets/${setId}/edit/`, { prompt });
  return response.data;
};

export const saveSet = async (id: string) => {
  const response = await api.post(`sets/${id}/save/`);
  return response.data;
};

export const deleteSet = async (id: string) => {
  const response = await api.delete(`sets/${id}/`);
  return response.data;
};

export const deleteQuestion = async (id: string) => {
  const response = await api.delete(`questions/${id}/`);
  return response.data;
};

export const submitFeedback = async (payload: FeedbackPayload): Promise<FeedbackEntry> => {
  const response = await api.post("feedback/", {
    ...payload,
    page: window.location.pathname,
  });
  return response.data;
};

export const updateQuestionManual = async (id: string, prompt: string, resyncAnswer: boolean) => {
  const response = await api.post(`questions/${id}/manual/`, { prompt, resyncAnswer });
  return response.data;
};

export const generateAlternativeQuestion = async (id: string) => {
  const response = await api.post(`questions/${id}/alternative/`);
  return response.data;
};