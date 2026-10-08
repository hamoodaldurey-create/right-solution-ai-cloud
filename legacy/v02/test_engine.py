import unittest
from unittest.mock import patch
from engine import answer, grounded_reply, FALLBACK

class EngineTests(unittest.TestCase):
    def test_pricing_grounded(self):
        self.assertIn('Demo prices only', grounded_reply('What is your pricing?'))
    def test_no_hallucinated_customers(self):
        self.assertEqual(FALLBACK, grounded_reply('Name your Fortune 500 customers'))
    def test_refund_human_review(self):
        self.assertIn('human', grounded_reply('Can I get a refund?'))
    def test_arabic_topic(self):
        self.assertIn('Starter', grounded_reply('ما سعر الاشتراك؟'))
    def test_free_mode_no_network(self):
        with patch.dict('os.environ', {'OPENAI_API_KEY': ''}):
            result, mode = answer('What integrations are live?')
        self.assertEqual(mode, 'local-demo')
        self.assertIn('not currently connected', result)

if __name__ == '__main__':
    unittest.main()
