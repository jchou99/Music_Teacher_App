// apiService.js
const API_BASE_URL = "http://127.0.0.1:8000/api";

// Global utilities accessible across all files
window.utils = {
  getTodayDateStr(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  }
};

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }
    if (response.status === 204 || config.method === "DELETE") {
      return { status: "deleted" };
    }
    return await response.json();
  } catch (error) {
    console.error(`API request failed on ${endpoint}:`, error);
    throw error;
  }
}

const apiService = {
  getStudents() {
    return request("/students");
  },
  createStudent(payload) {
    return request("/students", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateStudent(studentId, payload) {
    return request(`/students/${studentId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  deleteStudent(studentId) {
    return request(`/students/${studentId}`, {
      method: "DELETE"
    });
  },
  getLessons() {
    return request("/lessons");
  },
  rescheduleLesson(studentId, payload) {
    return request(`/lessons/${studentId}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getNotes(studentId) {
    return request(`/notes/${studentId}`);
  },
  saveNote(studentId, payload) {
    return request(`/notes/${studentId}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateNote(noteId, payload) {
    return request(`/notes/${noteId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  deleteNote(noteId) {
    return request(`/notes/${noteId}`, {
      method: "DELETE"
    });
  },
  getReminders(studentId) {
    return request(`/reminders/${studentId}`);
  },
  saveReminder(studentId, payload) {
    return request(`/reminders/${studentId}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateReminder(reminderId, payload) {
    return request(`/reminders/${reminderId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  deleteReminder(reminderId) {
    return request(`/reminders/${reminderId}`, {
      method: "DELETE"
    });
  },
  getEvents(studentId) {
    return request(`/events/${studentId}`);
  },
  saveEvent(studentId, payload) {
    return request(`/events/${studentId}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateEvent(eventId, payload) {
    return request(`/events/${eventId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  deleteEvent(eventId) {
    return request(`/events/${eventId}`, {
      method: "DELETE"
    });
  },
  getContact(studentId) {
    return request(`/contact/${studentId}`);
  },
  saveContact(studentId, payload) {
    return request(`/contact/${studentId}`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  getAISettings() {
    return request("/ai-settings");
  },
  saveAISettings(payload) {
    return request("/ai-settings", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};

window.apiService = apiService;