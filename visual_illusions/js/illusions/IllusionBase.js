
export class IllusionBase {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  update(deltaTime, config) {}

  render(ctx) {}

  onUserInteraction() {}

  getExplanationText() {
    return '';
  }

  
  getCustomParams() {
    return [];
  }

  
  onParamsChanged(params) {}
}
