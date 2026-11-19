/**
 * Chat Context Manager
 * Handles short conversation memory (up to 6 turns) and entity carryover
 * for follow-up questions like "and in Koramangala?", "what about potholes?", "how many are resolved there?"
 */

export class ConversationContext {
  constructor(history = []) {
    // history is expected to be an array of messages: [{ role: 'user'|'assistant', content: string }]
    this.history = Array.isArray(history) ? history.slice(-6) : [];
    this.lastEntities = this.extractRecentEntities();
  }

  extractRecentEntities() {
    const entities = {
      ward: null,
      category: null,
      issueId: null,
      status: null,
    };

    // Scan backwards through user messages in history
    for (let i = this.history.length - 1; i >= 0; i--) {
      const msg = this.history[i];
      if (msg && msg.role === "user" && typeof msg.content === "string") {
        const text = msg.content;
        
        // Match issue ID
        if (!entities.issueId) {
          const m = text.match(/(?:issue|complaint|#|id)\s*#?\s*(\d{1,6})/i);
          if (m) entities.issueId = parseInt(m[1], 10);
        }

        // Match ward numbers or common ward names
        if (!entities.ward) {
          const w = text.match(/ward\s*#?\s*(\d{1,3})/i);
          if (w) entities.ward = `Ward ${w[1]}`;
          else {
            const areas = ["koramangala", "indiranagar", "whitefield", "jayanagar", "majestic", "hebbal", "yelahanka", "banashankari", "malleshwaram", "electronic city", "marathahalli", "rajajinagar"];
            for (const a of areas) {
              if (text.toLowerCase().includes(a)) {
                entities.ward = a;
                break;
              }
            }
          }
        }

        // Match category keywords
        if (!entities.category) {
          const catMap = {
            pothole: "ROAD",
            road: "ROAD",
            footpath: "ROAD",
            light: "STREET_LIGHT",
            streetlight: "STREET_LIGHT",
            water: "WATER",
            drain: "WATER",
            sewage: "WATER",
            garbage: "SANITATION",
            waste: "SANITATION",
            trash: "SANITATION",
            electric: "ELECTRICITY",
            power: "ELECTRICITY",
            park: "PARK",
            garden: "PARK",
            gas: "GAS",
            pipeline: "GAS",
          };
          for (const [kw, c] of Object.entries(catMap)) {
            if (text.toLowerCase().includes(kw)) {
              entities.category = c;
              break;
            }
          }
        }
      }
    }

    return entities;
  }

  mergeWithCurrent(currentEntities) {
    return {
      ward: currentEntities.ward || this.lastEntities.ward,
      category: currentEntities.category || this.lastEntities.category,
      issueId: currentEntities.issueId || this.lastEntities.issueId,
      status: currentEntities.status || this.lastEntities.status,
      dateRange: currentEntities.dateRange,
    };
  }
}
