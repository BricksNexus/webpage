(function() {
    const panel = document.getElementById('chatbot-panel');
    const toggle = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const messagesEl = document.getElementById('chatbot-messages');
    const inputEl = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send');

    let step = 'welcome';
    let userOwnsHome = null;
    let userLocation = '';

    const WELCOME = "Hi! I can help you discover opportunities you might not be aware of—like adding units to your property (ADUs, duplexes) based on zoning. Do you own a home?";
    const ASK_LOCATION = "Great. To explore zoning and development potential, what city or county is your property in? (e.g. Austin, TX or Travis County)";
    const NO_HOME = "No problem. You can still post land or development opportunities on BricksNexus. Want to continue with your current opportunity, or explore other options?";
    const ANALYZING = "Checking zoning and development rules for your area...";
    const ANALYSIS_TEMPLATE = (location) => `Based on typical zoning in **${location}**, here are opportunities many homeowners don’t consider:

• **Accessory Dwelling Units (ADUs)** – Many cities allow a small second unit (granny flat, garage conversion). Can add rental income or space for family.

• **Multi-family or duplex** – Some zones allow converting or building 2–4 units. Zoning varies by lot size and street.

• **Lot split or subdivision** – If the lot is large enough, splitting might be allowed, creating a buildable lot to sell or develop.

• **Basement or attic conversion** – Often allowed as “existing structure” if up to code; can create a separate unit where zoning allows.

I’m not a substitute for your local planning department. For your exact address, check your city/county zoning map and ADU ordinances—they’ll tell you what’s allowed and what permits you need. Would you like to add one of these as an opportunity on this page?`;

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function renderMarkdownLite(text) {
        return escapeHtml(text)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }

    function addMessage(text, isBot) {
        const div = document.createElement('div');
        div.className = 'chatbot-msg ' + (isBot ? 'chatbot-msg-bot' : 'chatbot-msg-user');
        const inner = document.createElement('div');
        inner.className = 'chatbot-msg-bubble';
        inner.innerHTML = isBot ? renderMarkdownLite(text) : escapeHtml(text);
        div.appendChild(inner);
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function botReply(text) {
        addMessage(text, true);
    }

    function sendUserMessage(text) {
        if (!text.trim()) return;
        addMessage(text.trim(), false);
        inputEl.value = '';
        processUserInput(text.trim());
    }

    function processUserInput(text) {
        const lower = text.toLowerCase();

        if (step === 'welcome') {
            if (lower === 'yes' || lower === 'y' || lower === 'i do' || lower === 'owned' || lower.includes('own')) {
                userOwnsHome = true;
                step = 'location';
                botReply(ASK_LOCATION);
            } else {
                userOwnsHome = false;
                step = 'done';
                botReply(NO_HOME);
            }
            return;
        }

        if (step === 'location') {
            userLocation = text.slice(0, 80);
            step = 'analyzing';
            botReply(ANALYZING);
            setTimeout(function() {
                botReply(ANALYSIS_TEMPLATE(userLocation || 'your area'));
                step = 'done';
            }, 1800);
            return;
        }

        if (step === 'done') {
            botReply("You can keep posting your opportunity above, or ask me something else (e.g. 'What’s an ADU?' or 'How do I check zoning?').");
        }
    }

    function openChat() {
        panel.classList.add('chatbot-panel-open');
        toggle.classList.add('chatbot-toggle-hidden');
        if (messagesEl.children.length === 0) {
            botReply(WELCOME);
        }
        inputEl.focus();
    }

    function closeChat() {
        panel.classList.remove('chatbot-panel-open');
        toggle.classList.remove('chatbot-toggle-hidden');
    }

    toggle.addEventListener('click', openChat);
    closeBtn.addEventListener('click', closeChat);

    sendBtn.addEventListener('click', function() {
        sendUserMessage(inputEl.value);
    });

    inputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendUserMessage(inputEl.value);
        }
    });

})();
