import roomDetailCssUrl from '../assets/css/room-detail.css?url';
import usePageStylesheet from '../hooks/usePageStylesheet.js';
import RoomDetailTemplate from '../components/RoomDetailTemplate.jsx';
import roomDetails from '../data/roomDetails.js';

export default function RoomDetail02() {
  usePageStylesheet(roomDetailCssUrl);
  return <RoomDetailTemplate data={roomDetails['2']} />;
}
