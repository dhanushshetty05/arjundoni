export interface Subtitle {
  id: number;
  start: number; // in seconds
  end: number;   // in seconds
  text: string;
}

// Convert "HH:MM:SS,mmm" or "HH:MM:SS.mmm" to seconds
export function parseTimestampToSeconds(timestamp: string): number {
  const clean = timestamp.trim().replace(',', '.');
  const parts = clean.split(':');
  if (parts.length !== 3) return 0;
  
  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1]);
  const seconds = parseFloat(parts[2]);
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Parses raw SRT string content
export function parseSRT(srtContent: string): Subtitle[] {
  const subtitles: Subtitle[] = [];
  // Remove UTF-8 BOM if present
  const cleanContent = srtContent.replace(/^\uFEFF/, '').trim();
  // Split blocks by double newline, allowing optional spaces on the blank line
  const blocks = cleanContent.split(/\r?\n\s*\r?\n/);
  
  for (const block of blocks) {
    const lines = block.trim().split(/\r?\n/);
    if (lines.length < 1) continue;
    
    let timeLine = '';
    let textLines: string[] = [];
    let id = NaN;
    
    if (lines[0].includes('-->')) {
      timeLine = lines[0];
      textLines = lines.slice(1);
    } else if (lines.length >= 2 && lines[1].includes('-->')) {
      id = parseInt(lines[0], 10);
      timeLine = lines[1];
      textLines = lines.slice(2);
    } else {
      // Not a valid subtitle block
      continue;
    }
    
    // Permissive regex for SRT timestamps (handles optional milliseconds, 1-2 digit hours)
    const timeMatch = timeLine.match(/(\d{1,2}:\d{2}:\d{2}(?:[,\.]\d{1,3})?)\s*-->\s*(\d{1,2}:\d{2}:\d{2}(?:[,\.]\d{1,3})?)/);
    if (!timeMatch) continue;
    
    const start = parseTimestampToSeconds(timeMatch[1]);
    const end = parseTimestampToSeconds(timeMatch[2]);
    const text = textLines.join('\n').trim();
    
    // If ID is missing/NaN, assign a sequential one
    const finalId = isNaN(id) ? subtitles.length + 1 : id;
    
    if (!isNaN(start) && !isNaN(end)) {
      subtitles.push({ id: finalId, start, end, text });
    }
  }
  
  return subtitles.sort((a, b) => a.start - b.start);
}

// Generate realistic mock subtitles for any movie, spanning from 0 to 3 hours
export function generateMockSubtitles(movieName: string, language: string): Subtitle[] {
  const subtitles: Subtitle[] = [];
  
  // Dialog entries in Kannada and English fallback
  const dialogues = [
    {
      kannada: "ಸ್ವಾಗತ! ಈ ಚಿತ್ರದ ಕಥೆ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ...",
      english: "Welcome! The story of this movie begins..."
    },
    {
      kannada: "ಈ ಸನ್ನಿವೇಶದಲ್ಲಿ ಹಿನ್ನೆಲೆ ಸಂಗೀತ ಮತ್ತು ಧ್ವನಿ ಅದ್ಭುತವಾಗಿದೆ.",
      english: "[AD] Thrilling drums escalate in the background."
    },
    {
      kannada: "ನೀನು ಎಲ್ಲಿಗೆ ಹೋಗುತ್ತಿದ್ದೀಯಾ? ಇಲ್ಲೇ ಇರು!",
      english: "Where are you going? Stay right here!"
    },
    {
      kannada: "[AD] ನಾಯಕನು ಕೋಪದಿಂದ ಕಾಡಿನ ಕಡೆಗೆ ಓಡುತ್ತಾನೆ.",
      english: "[AD] The protagonist runs angrily towards the forest."
    },
    {
      kannada: "ನನಗೆ ಈ ವಿಷಯದ ಬಗ್ಗೆ ಮುಂಚೆಯೇ ತಿಳಿದಿರಬೇಕಿತ್ತು.",
      english: "I should have known about this earlier."
    },
    {
      kannada: "ಕಾಪಾಡಿ! ಯಾರಾದರೂ ಸಹಾಯ ಮಾಡಿ!",
      english: "Help! Somebody help me!"
    },
    {
      kannada: "[AD] ಅರಣ್ಯದಲ್ಲಿ ಮಳೆ ಜೋರಾಗಿ ಸುರಿಯಲಾರಂಭಿಸಿದೆ.",
      english: "[AD] Heavy rain starts pouring in the forest."
    },
    {
      kannada: "ನಮ್ಮ ಸಂಸ್ಕೃತಿಯೇ ನಮ್ಮ ಶಕ್ತಿ, ಎಂದಿಗೂ ಮರೆಯಬೇಡ.",
      english: "Our culture is our strength, never forget it."
    },
    {
      kannada: "ಚಿಂತೆ ಮಾಡಬೇಡ, ನಾನು ನಿನ್ನ ಜೊತೆಗಿದ್ದೇನೆ.",
      english: "Don't worry, I am with you."
    },
    {
      kannada: "[AD] ನಾಯಕನು ತಲೆಯೆತ್ತಿ ಆಕಾಶವನ್ನು ನೋಡುತ್ತಾನೆ.",
      english: "[AD] The hero looks up at the sky in reflection."
    },
    {
      kannada: "ಇದು ನಮ್ಮ ಕೊನೆಯ ಅವಕಾಶ, ಗೆಲ್ಲಲೇಬೇಕು!",
      english: "This is our last chance, we must win!"
    }
  ];
  
  let currentId = 1;
  // Generate dialogues every 4-6 seconds starting from 0 to 10800 seconds (3 hours)
  for (let time = 0; time < 10800; time += 5) {
    const diag = dialogues[Math.floor((time / 5) % dialogues.length)];
    const text = language.toUpperCase() === 'KANNADA' ? diag.kannada : diag.english;
    
    subtitles.push({
      id: currentId++,
      start: time,
      end: time + 4,
      text: `[${movieName}] ${text}`
    });
  }
  
  return subtitles;
}
