import '../css/style.css';

const ChatMessages = ({ chatHistory, loading, chatContainerRef }) => {
    return (
      <div className="flex-1 p-3 overflow-y-auto bg-gray-50" ref={chatContainerRef}>
        {chatHistory.length === 0 ? <p className="text-center text-gray-600">Upload a document and start chatting!</p> :
          chatHistory.map((msg, index) => (
            <div key={index} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded-2xl px-4 py-3 max-w-md ${msg.type === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-700 shadow-sm'}`}>
                {msg.content}
              </div>
            </div>
          ))}
        {loading && <p>Loading...</p>}
      </div>
    );
  };
  export default ChatMessages;
  