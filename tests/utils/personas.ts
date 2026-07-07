export interface Persona {
  name: string;
  age: number;
  device: 'iPhone' | 'Android' | 'Desktop';
  techLevel: 'very_high' | 'high' | 'medium' | 'low';
  viewport: { width: number; height: number };
  userAgent?: string;
}

export const personas: Persona[] = [
  {
    name: 'Ece',
    age: 18,
    device: 'iPhone',
    techLevel: 'very_high',
    viewport: { width: 390, height: 844 }, // iPhone 13 Pro
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  },
  {
    name: 'Mert',
    age: 24,
    device: 'Android',
    techLevel: 'medium',
    viewport: { width: 412, height: 915 }, // Galaxy S20
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36'
  },
  {
    name: 'Selin',
    age: 31,
    device: 'iPhone',
    techLevel: 'high',
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  },
  {
    name: 'Burak',
    age: 38,
    device: 'Android',
    techLevel: 'medium',
    viewport: { width: 360, height: 800 }, // Moto G Power
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36'
  },
  {
    name: 'Ayşe',
    age: 45,
    device: 'Android',
    techLevel: 'low',
    viewport: { width: 412, height: 892 }, // Pixel 6
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36'
  },
  {
    name: 'Deniz',
    age: 52,
    device: 'iPhone',
    techLevel: 'medium',
    viewport: { width: 428, height: 926 }, // iPhone 13 Pro Max
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  },
  {
    name: 'Kerem',
    age: 29,
    device: 'Android',
    techLevel: 'high',
    viewport: { width: 384, height: 854 },
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36'
  },
  {
    name: 'Hülya',
    age: 63,
    device: 'Android',
    techLevel: 'low',
    viewport: { width: 360, height: 740 },
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36'
  },
  {
    name: 'Can',
    age: 34,
    device: 'iPhone',
    techLevel: 'high',
    viewport: { width: 375, height: 812 }, // iPhone 12 Mini
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
  },
  {
    name: 'Nazlı',
    age: 27,
    device: 'Android',
    techLevel: 'high',
    viewport: { width: 412, height: 915 },
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Mobile Safari/537.36'
  }
];
