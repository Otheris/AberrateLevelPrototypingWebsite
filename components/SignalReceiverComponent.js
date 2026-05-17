import { Component } from "./Component.js";


export class SignalReceiverComponent extends Component {
  constructor({ receiverMode = SignalReceiverComponent.MODE_EQUALS, requiredStrength = 0 } = {}) {
    super();
    this.receiverMode = receiverMode;
    this.requiredStrength = requiredStrength;
    this.currentSignalStrength = 0;
    this.senderStates = new Map();
  }

  // Receiver mode constants
  static MODE_EQUALS = 0;
  static MODE_GREATER_OR_EQUAL = 1;
  static MODE_LESS_OR_EQUAL = 2;
  static MODE_GREATER_THAN = 3;
  static MODE_LESS_THAN = 4;

  receiveSignal(strength) {
    const prevSignalStrength = this.currentSignalStrength;
    const reqMetBefore = this.doesSignalMeetsReq(prevSignalStrength);

    // Update signal strength
    this.currentSignalStrength += strength;

    const reqMetAfter = this.doesSignalMeetsReq(this.currentSignalStrength);

    // Call onReqMet() or onReqUnmet() if needed
    if (reqMetBefore !== reqMetAfter) {
      if (reqMetAfter) this.onReqsMet();
      else this.onReqsUnmet();
    }
  }

  onSignalStateChanged(sender, stateValue) {
    this.senderStates.set(sender, stateValue);

    // Calculate total absolute strength from all connected senders
    let totalStrength = 0;
    this.senderStates.forEach(val => totalStrength += val);

    const reqMetBefore = this.doesSignalMeetsReq(this.currentSignalStrength);
    this.currentSignalStrength = totalStrength;
    const reqMetAfter = this.doesSignalMeetsReq(this.currentSignalStrength);

    if (reqMetBefore !== reqMetAfter) {
      if (reqMetAfter) this.onReqsMet();
      else this.onReqsUnmet();
    }
  }

  doesSignalMeetsReq(strength) {
    switch (this.receiverMode) {
      case SignalReceiverComponent.MODE_EQUALS:
        return strength === this.requiredStrength;
      case SignalReceiverComponent.MODE_GREATER_OR_EQUAL:
        return strength >= this.requiredStrength;
      case SignalReceiverComponent.MODE_LESS_OR_EQUAL:
        return strength <= this.requiredStrength;
      case SignalReceiverComponent.MODE_GREATER_THAN:
        return strength > this.requiredStrength;
      case SignalReceiverComponent.MODE_LESS_THAN:
        return strength < this.requiredStrength;
      default:
        return false;
    }
  }

  onReqsMet() {
    this.entity.call('onReceiverReqsMet');
  }

  onReqsUnmet() {
    this.entity.call('onReceiverReqsUnmet');
  }
}
