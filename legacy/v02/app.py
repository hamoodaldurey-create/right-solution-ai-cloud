import os
import streamlit as st
from engine import KNOWLEDGE, answer

st.set_page_config(page_title='Right Solution AI Cloud', page_icon='🌐', layout='wide')
st.title('Right Solution AI Cloud')
st.caption('Grounded Sales & Support Assistant — prototype v0.2')
if os.getenv('OPENAI_API_KEY'):
    st.success('AI mode enabled. API usage may incur charges.')
else:
    st.info('Free local demo mode. Add OPENAI_API_KEY as a hosting secret to enable AI responses.')
st.warning('Prototype only. Do not enter real customer secrets, passwords, or payment information.')

with st.sidebar:
    st.header('Verified demo knowledge')
    for key, value in KNOWLEDGE.items():
        st.markdown(f'**{key.title()}**: {value}')
    st.divider()
    st.caption('Lead details are shown locally in this session and are not sent to a CRM.')
    with st.form('lead'):
        name = st.text_input('Name')
        email = st.text_input('Business email')
        need = st.text_area('What would you like to automate?')
        submitted = st.form_submit_button('Prepare lead summary')
    if submitted:
        if not name.strip() or '@' not in email or not need.strip():
            st.error('Please complete all fields with a valid-looking email.')
        else:
            st.success('Draft lead summary (not sent)')
            st.code(f'Name: {name}\nEmail: {email}\nNeed: {need}')

if 'messages' not in st.session_state:
    st.session_state.messages = [{'role': 'assistant', 'content': 'Hello! Ask about demo pricing, integrations, security, support hours, or refunds.'}]
for m in st.session_state.messages:
    with st.chat_message(m['role']):
        st.write(m['content'])
question = st.chat_input('Ask about the prototype', max_chars=2000)
if question:
    prior = st.session_state.messages[-8:]
    st.session_state.messages.append({'role': 'user', 'content': question})
    try:
        reply, mode = answer(question, history=prior)
    except Exception:
        reply, mode = ('The AI service is unavailable. Please retry later or contact a human.', 'error')
    st.session_state.messages.append({'role': 'assistant', 'content': reply})
    st.caption(f'Engine: {mode}')
    st.rerun()
