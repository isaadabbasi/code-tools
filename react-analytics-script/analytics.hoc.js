import React from 'react';
import { sendAnalytics } from '../services/analyticsService';

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
