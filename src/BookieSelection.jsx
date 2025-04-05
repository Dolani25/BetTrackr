import React, { useState } from "react";
import "./BookieSelection.css"; 
import { useNavigate } from "react-router-dom";

import { FaArrowLeft, FaTimes, FaSearch, FaChevronRight } from "react-icons/fa";


const bookies = [
  { name: "BetWinner", logo: "/assets/betwinner.png", defaultClass: "betwinner-logo" },
  { name: "SportyBet", logo: "/assets/sportybet.jpg", defaultClass: "Sportybet-logo" },
  { name: "MelBet", logo: "/assets/melbet.png", defaultClass: "Sportybet-logo" },
  { name: "Parimatch", logo: "/assets/parimatch.jpeg", defaultClass: "Sportybet-logo" },
  { name: "BetWay", logo: "/assets/betway.png", defaultClass: "Sportybet-logo" },
  { name: "MSport", logo: "/assets/Msport.png", defaultClass: "Sportybet-logo" },
  { name: "BetBonaza", logo: "/assets/betbonaza.jpeg", defaultClass: "Sportybet-logo" },
  { name: "1xBet", logo: "/assets/1xbet.png", defaultClass: "Sportybet-logo" },
  { name: "22Bet", logo: "/assets/22bet.jpeg", defaultClass: "Sportybet-logo" },
  { name: "NairaBet", logo: "/assets/nairabet.png", defaultClass: "Sportybet-logo" },
  { name: "Bet365", logo: "/assets/bet365.png", defaultClass: "Sportybet-logo" },
  { name: "Paripesa", logo: "/assets/paripesa (2).jpeg", defaultClass: "Sportybet-logo" },
  { name: "Bet9ja", logo: "/assets/bet9ja.jpeg", defaultClass: "Sportybet-logo" },
  { name: "WazoBet", logo: "/assets/wazobet.jpg", defaultClass: "Sportybet-logo" },
];

const Header = () => (
  
  <header>
    <button className="back-button"><FaArrowLeft /></button>
    <div style={{display:"flex" , justifyContent:"center"}} id="logo">
      <img style={{height:"24px", marginRight:"7px" , width:"24px"}} src="/assets/dice.png" alt="BetTrackr" /> 
      <h style={{marginTop:"3px"}} >BetTrackr</h>
    </div>
    <button className="close-button"><FaTimes /></button>
  </header>
  
);

const SearchBar = ({ searchTerm, setSearchTerm }) => (
  <div className="search-container">
    <input
      className="search-box"
      type="text"
      placeholder="Search Betting bookie..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
    <span id="search"><FaSearch /></span>
  </div>
);

const BookieList = ({ searchTerm }) => {
  const navigate = useNavigate();

  return (
    <div className="bookie-list">
      {bookies
        .filter((bookie) => bookie.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .map((bookie, index) => (
          <div 
            className="bookie-item" 
            key={index} 
            onClick={() => navigate(`/login/${bookie.name}`, { state: { bookie } })}
          >
            <img className="bookie-logo" src={bookie.logo} alt={bookie.name} />
            <div className="bookie-name">{bookie.name}</div>
            <FaChevronRight className="fa-chevron-right" />
          </div>
        ))}
    </div>
  );
};

const BookieSelection = () => {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div>
      <Header />
      <section>
        <h2>Choose your Bookie</h2>
        <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
        <BookieList searchTerm={searchTerm} />
      </section>
    </div>
  );
};

export default BookieSelection;