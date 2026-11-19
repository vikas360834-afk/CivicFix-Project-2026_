import IssueMap from "../pages/IssueMap.jsx";

/**
 * Reusable MapComponent wrapping the Smart City Interactive Leaflet Map
 */
export default function MapComponent(props) {
  return <IssueMap {...props} />;
}
