import {
  SELECT_GAMEMODE,
  ADD_CARD,
  ADD_PLAYER,
  DELETE_PLAYER,
  SET_PLAYER_NAME,
  INCREMENT_CURRENT_CARD,
  DECREMENT_CURRENT_CARD
} from "../actions/game";
import CardDeck, {
  introductionCards,
  endCard,
  PLAYER
} from "../../ressources/cards";
import { GameModeId } from "../../ressources/gameModes";

const initialState = {
  cards: [],
  players: [{ name: "" }],
  currentCardIndex: 0
};

//TODO : Reflechir à une solution pour simplifier ce reducer trop complexe
export default function game(state = initialState, action) {
  switch (action.type) {
    /** GameMode */
    case SELECT_GAMEMODE:
      /** A la selection d'un mode de jeu, on initialise la partie
       * on récupère donc les cartes d'introduction (au moins deux)
       * et on récupère un deck, qui corresponds aux cartes appartement à se mode de jeu
       */
      let { introCards, deck } = initializeGameMode(
        action.gamemode,
        state.players
      );
      return {
        ...state,
        gamemode: action.gamemode,
        cards: [...introCards],
        deck: [...deck],
        currentCardIndex: initialState.currentCardIndex
      };
    /** Cards */
    case ADD_CARD:
      return { ...state, cards: [...state.cards, action.card] };
    case INCREMENT_CURRENT_CARD:
      /** Lorsqu'on se deplace sur la carte suivante */
      let newCurrentCard = state.currentCardIndex + 1;
      /** Si cette carte est l'avance dernière des cartes déjà prête */
      if (
        newCurrentCard >= state.cards.length - 2 &&
        state.cards[newCurrentCard].title !== endCard.title
      ) {
        /** On prépare une nouvelle carte */
        let { nextCard, newDeck } = generateNextCard(state.players, state.deck);
        return {
          ...state,
          currentCardIndex: newCurrentCard,
          cards: [...state.cards, { ...nextCard }],
          deck: [...newDeck]
        };
      } else {
        /** Sinon, on indique simplement qu'on est sur la carte suivante */
        return { ...state, currentCardIndex: newCurrentCard };
      }

    case DECREMENT_CURRENT_CARD:
      return {
        ...state,
        currentCardIndex:
          state.currentCardIndex > 0
            ? state.currentCardIndex - 1
            : state.currentCardIndex
      };
    /** Players */
    case ADD_PLAYER:
      return { ...state, players: [...state.players, { name: "" }] };
    case DELETE_PLAYER:
      let newPlayers = [...state.players];
      newPlayers.splice(action.index, 1);
      return { ...state, players: newPlayers };
    case SET_PLAYER_NAME: {
      let newPlayers = [...state.players];
      newPlayers[action.index] = { name: action.name };
      if (state.gamemode) {
        let newCards = [...state.cards];
        let { nextCard, newDeck } = regenerateLastCard(
          newPlayers,
          state.deck,
          newCards
        );
        newCards.splice(newCards.length - 1, 1, nextCard);
        return {
          ...state,
          players: newPlayers,
          cards: [...newCards],
          deck: [...newDeck]
        };
      } else {
        return {
          ...state,
          players: newPlayers
        };
      }
    }
    default:
      return state;
  }
}
/**GameMode */
export const getGamemode = state => state.game.gamemode;
/** Cards */
export const getCards = state => state.game.cards;
export const getCurrentCardIndex = state => state.game.currentCardIndex;
export const isGameFinished = state =>
  state.game.cards[state.game.cards.length - 1].title === endCard.title;
export const isEndCardSelected = state =>
  state.game.cards[state.game.currentCardIndex].title === endCard.title;
/** Player */
export const getPlayers = state => state.game.players;
export const hasPlayer = state =>
  state.game.players.some(player => player.name !== "");

/**
 * Permet de regenerer la dernière carte, c'est à dire
 * Modifier le deck en ajoutant 1 occurances à la dernière carte tirée
 * Puis retourne l'appel d'une generation de carte classique
 * @param {*} players
 * @param {*} deck
 * @param {*} cards
 */
function regenerateLastCard(players, deck, cards) {
  let newCards = [...cards];
  let newDeck = [...deck];
  let lastCard = newCards[newCards.length - 1];
  let lastCardIndexInDeck = newDeck.findIndex(
    card => card.title === lastCard.title
  );
  newDeck[lastCardIndexInDeck].nbOccurences++;

  return generateNextCard(players, deck);
}
/**
 * Génére une nouvelle carte tirée dans le deck, crée en fonction des joueurus
 * Retour la carte, ainsi que le deck mis à jour ("retrait" de la carte tirée)
 * @param {*} players
 * @param {*} deck
 */
function generateNextCard(players, deck) {
  let newDeck = [...deck];
  let possibleCards = newDeck.filter(
    card => card.nbPlayers <= players.length && card.nbOccurences > 0
  );
  let nextCard;
  if (possibleCards.length > 0) {
    let indexOfSelectedCard = Math.floor(Math.random() * possibleCards.length);
    nextCard = proccessCard(possibleCards[indexOfSelectedCard], players);
    let indexInDeck = newDeck.findIndex(card => nextCard.title === card.title);
    let cardInDeck = newDeck[indexInDeck];
    let newNbOccurences = cardInDeck.nbOccurences - 1;
    newDeck[indexInDeck] = {
      ...newDeck[indexInDeck],
      nbOccurences: newNbOccurences
    };
  } else {
    nextCard = endCard;
  }
  return { nextCard, newDeck };
}

/**
 * Permet d'initialiser une partie à l'aide du mode de jeu et des joueurs
 * On va générer le deck de cartes,
 * et tirer les cartes d'introduction
 * Si on à moins de 2 cartes d'introduction pour ce mode de jeu
 * on va aller tirer des cartes dans le deck
 * @param {*} gamemode
 * @param {*} players
 */
function initializeGameMode(gamemode, players) {
  let introCards = introductionCards.filter(card =>
    isCardInGameMode(card, gamemode)
  );
  let deck = createDeck(gamemode);
  while (introCards.length < 2) {
    let result = generateNextCard(players, deck);
    deck = result.newDeck;
    introCards.push(result.nextCard);
  }
  return { introCards, deck };
}

/**
 * Crée un deck à partir du mode de jeu
 * C'est à dire qu'on va récupérer dans la liste des cartes de l'application
 * les cartes correspondant à ce mode de jeu
 * @param {*} gamemode
 */
function createDeck(gamemode) {
  return CardDeck.filter(card => isCardInGameMode(card, gamemode));
}

/**
 * Fonction indiquant si la carte passé en paramètre corresponds au mode de jeu
 * lui aussi passé en paramètre
 * @param {*} card
 * @param {*} gamemode
 */
function isCardInGameMode(card, gamemode) {
  return (
    card.gameMode.includes(gamemode) || card.gameMode.includes(GameModeId.ANY)
  );
}

function proccessCard(card, players) {
  let newCard = { ...card };
  let playersAvailable = [...players];
  let playerNumber = 1;
  let selectPlayer = () => {
    let index = Math.floor(Math.random() * playersAvailable.length);
    return { index, player: playersAvailable[index] };
  };
  let needPlayer = () => newCard.text.includes(PLAYER + playerNumber);
  let playerSelected;
  while (playersAvailable.length > 0 && needPlayer()) {
    playerSelected = selectPlayer();
    newCard.text = newCard.text
      .split(PLAYER + playerNumber)
      .join(playerSelected.player.name);
    playersAvailable.splice(playerSelected.index);
    playerNumber++;
  }
  return newCard;
}