export interface Product {
  id: string;
  name: string;
  client: string;
  image: string;
  description: string;
  priority: number;
  createdAt: string;
}

export interface HexPosition {
  q: number; // axial coordinate
  r: number; // axial coordinate
  x: number; // pixel x
  y: number; // pixel y
}

export interface ViewState {
  offsetX: number;
  offsetY: number;
  scale: number;
}
