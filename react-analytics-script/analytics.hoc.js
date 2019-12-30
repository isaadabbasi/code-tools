import React from 'react';
import { analyticsService } from '../services/analyticsWorkerService';

export default function WithAnalytics(WrappedComponent) {
  return class AnalyticsWrapper extends React.Component {
    startDateTime;
    endDateTime;
    constructor(props) {
      super(props);
      this.sendAnalytics = sendAnalytics.bind(this);
    }
    componentDidMount() {
      this.startDateTime = new Date().toString();
    }

    componentWillUnmount() {
      const endDateTime = new Date().toString();
      const analyticsProps = this.props.analytics;
      this.sendAnalytics({
        actionCategory: analyticsProps.actionCategory,
        actionName: analyticsProps.actionName,
        endDateTime,
        startDateTime: this.startDateTime
      });
    }
    render() {
      if (!WrappedComponent) return null;
      return (
        <WrappedComponent {...this.props} sendAnalytics={this.sendAnalytics} />
      );
    }
  };
}

/**
 * @param {{
 *  actionName: string;
 *  actionCategory: string;
 *  startDateTime: Date
 * }} [analyticsPayload={}]
 */
export function sendAnalytics(analyticsPayload = {}) {
  // must bind to component
  const validFields = ['actionName', 'actionCategory', 'startDateTime'];
  const isValidPayload = validFields.every(key =>
    analyticsPayload.hasOwnProperty(key)
  );
  if (!isValidPayload) {
    console.error('Invalid analytics payload, required fields', validFields);
    return;
  }
  const analyticsProps = this.props.analytics;
  const analytics = {
    actionCategory: analyticsPayload.actionCategory,
    actionName: analyticsPayload.actionName,
    actionTab: analyticsProps.hash,
    clinicId: analyticsProps.clinicId,
    endDateTime: analyticsPayload.endDateTime,
    startDateTime: analyticsPayload.startDateTime,
    userId: analyticsProps.userId
  };
  analyticsService.sendAnalytics(analytics);
}

/**
 * @export
 * @param {string} actionCategory
 * @param {string} actionName
 * @param {string} startDateTime
 * @param {string} [endDateTime]
 */
export function makeAnalyticsPayload(
  actionCategory,
  actionName,
  startDateTime,
  endDateTime
) {
  return {
    actionCategory,
    actionName,
    endDateTime,
    startDateTime
  };
}
