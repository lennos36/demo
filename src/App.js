import './App.css';
import React, { useEffect, useReducer } from 'react'
import { withAuthenticator } from 'aws-amplify-react'
import { Auth } from 'aws-amplify'
import { DataStore, Predicates } from "@aws-amplify/datastore";
import { Chatty } from "./models";
import moment from 'moment'



const initialState = {
  username: "",
  messages: [],
  message: ""
}

function reducer(state, action) {
  switch(action.type) {
    case 'setUser':
      return { ...state, username: action.username }
    case 'set':
      return { ...state, messages: action.messages }
    case 'add':
      return { ...state, messages: [ ...state.messages, action.message ] }
    case 'updateInput':
      return { ...state, [action.inputValue]: action.value }
    default: new Error()
  }
}

async function getMessages(dispatch) {
  try {
    const messagesData = await DataStore.query(Chatty, Predicates.ALL);
    const sorted = [...messagesData].sort((b, a) => -a.createdAt.localeCompare(b.createdAt))
    dispatch({ type: 'set', messages: sorted })
  } catch (err) {
    console.log('error fetching messages...', err)
  }
}

async function createMessage(state, dispatch) {
  if (state.message === '') return;
  try {
    await DataStore.save(
      new Chatty({
        user: state.username,
        message: state.message,
        createdAt: new Date().toISOString()
      })
    );
    
    state.message = '';
    getMessages(dispatch);
  } catch (err) {
    console.log('error creating message...', err)
  }
}

function updater(value, inputValue, dispatch) {
  dispatch({ type: 'updateInput', value, inputValue })
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    Auth.currentAuthenticatedUser().then(user => {
      dispatch({ type: 'setUser', username: user.username })
    })
    getMessages(dispatch)

    const subscription = DataStore.observe(Chatty).subscribe(msg => {
      console.log(msg.model, msg.opType, msg.element);
      getMessages(dispatch)
    });
    
    return () => subscription.unsubscribe();
  }, [])
  
  return (
    <div className="app">
      <div className="messages">
        <div className="messages-scroller">
          { state.messages.map((message, index) => (
            <div key={ message.id } className={message.user ===  Auth.user.username? 'message me' : 'message'}>
              <div className="name">{ message.user }</div>
              <div>{ message.message }</div>
                <div className="date">{ moment(message.createdAt).format('HH:mm')}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="chat-bar">
        <input
          type="text" placeholder="Enter your message..."
          onChange={ e => updater(e.target.value, 'message', dispatch) }
          value={ state.message }
        />
        <button className="send-message-button" onClick={() => createMessage(state, dispatch)}>Create Message</button>
      </div>
    </div>
  );
}

export default withAuthenticator(App, { includeGreetings: true })