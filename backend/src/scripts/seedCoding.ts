/**
 * Seed coding problems for the playground
 * Run: npx ts-node --project tsconfig.json src/scripts/seedCoding.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { CodingProblem } from '../models/CodingProblem';

const problems = [
  {
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'easy',
    category: ['Arrays', 'Hash Table'],
    description: 'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.',
    constraints: '2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9\nOnly one valid answer exists.',
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
      { input: 'nums = [3,2,4], target = 6', output: '[1,2]' },
    ],
    starterCode: [
      { language: 'javascript', code: 'function twoSum(nums, target) {\n  // Your code here\n};' },
      { language: 'python', code: 'class Solution:\n    def twoSum(self, nums, target):\n        # Your code here\n        pass' },
      { language: 'java', code: 'class Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Your code here\n    }\n}' },
    ],
    testCases: [
      { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', isHidden: false },
      { input: '[3,2,4]\n6', expectedOutput: '[1,2]', isHidden: false },
      { input: '[3,3]\n6', expectedOutput: '[0,1]', isHidden: true },
    ],
    acceptanceRate: 49.5,
    tags: ['array', 'hash-table'],
    isDailyChallenge: true,
    dailyChallengeDate: new Date(),
  },
  {
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    difficulty: 'easy',
    category: ['Stack', 'String'],
    description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n- Open brackets must be closed by the same type of brackets.\n- Open brackets must be closed in the correct order.\n- Every close bracket has a corresponding open bracket of the same type.',
    constraints: '1 <= s.length <= 10^4\ns consists of parentheses only \'()[]{}\' ',
    examples: [
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' },
    ],
    starterCode: [
      { language: 'javascript', code: 'function isValid(s) {\n  // Your code here\n};' },
      { language: 'python', code: 'class Solution:\n    def isValid(self, s: str) -> bool:\n        pass' },
    ],
    testCases: [
      { input: '()', expectedOutput: 'true', isHidden: false },
      { input: '()[]{}\n', expectedOutput: 'true', isHidden: false },
      { input: '(]', expectedOutput: 'false', isHidden: true },
      { input: '([)]', expectedOutput: 'false', isHidden: true },
    ],
    acceptanceRate: 40.8,
    tags: ['stack', 'string'],
  },
  {
    title: 'Reverse Linked List',
    slug: 'reverse-linked-list',
    difficulty: 'easy',
    category: ['Linked List', 'Recursion'],
    description: 'Given the `head` of a singly linked list, reverse the list, and return the reversed list.',
    constraints: 'The number of nodes in the list is the range [0, 5000].\n-5000 <= Node.val <= 5000',
    examples: [
      { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]' },
      { input: 'head = [1,2]', output: '[2,1]' },
    ],
    starterCode: [
      { language: 'javascript', code: 'function reverseList(head) {\n  // Your code here\n};' },
      { language: 'python', code: 'class Solution:\n    def reverseList(self, head):\n        pass' },
    ],
    testCases: [
      { input: '[1,2,3,4,5]', expectedOutput: '[5,4,3,2,1]', isHidden: false },
      { input: '[1,2]', expectedOutput: '[2,1]', isHidden: false },
    ],
    acceptanceRate: 73.2,
    tags: ['linked-list'],
  },
  {
    title: 'Maximum Subarray',
    slug: 'maximum-subarray',
    difficulty: 'medium',
    category: ['Array', 'Dynamic Programming', 'Divide and Conquer'],
    description: 'Given an integer array `nums`, find the subarray with the largest sum, and return its sum.',
    constraints: '1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4',
    examples: [
      { input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]', output: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
      { input: 'nums = [1]', output: '1' },
      { input: 'nums = [5,4,-1,7,8]', output: '23' },
    ],
    starterCode: [
      { language: 'javascript', code: 'function maxSubArray(nums) {\n  // Kadane\'s Algorithm\n};' },
      { language: 'python', code: 'class Solution:\n    def maxSubArray(self, nums) -> int:\n        pass' },
    ],
    testCases: [
      { input: '[-2,1,-3,4,-1,2,1,-5,4]', expectedOutput: '6', isHidden: false },
      { input: '[1]', expectedOutput: '1', isHidden: false },
      { input: '[5,4,-1,7,8]', expectedOutput: '23', isHidden: true },
    ],
    acceptanceRate: 49.9,
    tags: ['dynamic-programming', 'array'],
  },
  {
    title: 'Binary Search',
    slug: 'binary-search',
    difficulty: 'easy',
    category: ['Array', 'Binary Search'],
    description: 'Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its index. Otherwise, return -1.\n\nYou must write an algorithm with O(log n) runtime complexity.',
    constraints: '1 <= nums.length <= 10^4\n-10^4 < nums[i], target < 10^4\nAll the integers in nums are unique.\nnums is sorted in ascending order.',
    examples: [
      { input: 'nums = [-1,0,3,5,9,12], target = 9', output: '4', explanation: '9 exists in nums and its index is 4' },
      { input: 'nums = [-1,0,3,5,9,12], target = 2', output: '-1' },
    ],
    starterCode: [
      { language: 'javascript', code: 'function search(nums, target) {\n  // Your code here\n};' },
      { language: 'python', code: 'class Solution:\n    def search(self, nums, target: int) -> int:\n        pass' },
    ],
    testCases: [
      { input: '[-1,0,3,5,9,12]\n9', expectedOutput: '4', isHidden: false },
      { input: '[-1,0,3,5,9,12]\n2', expectedOutput: '-1', isHidden: false },
    ],
    acceptanceRate: 55.1,
    tags: ['binary-search', 'array'],
  },
  {
    title: 'Climbing Stairs',
    slug: 'climbing-stairs',
    difficulty: 'easy',
    category: ['Dynamic Programming', 'Math', 'Recursion'],
    description: 'You are climbing a staircase. It takes `n` steps to reach the top.\n\nEach time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?',
    constraints: '1 <= n <= 45',
    examples: [
      { input: 'n = 2', output: '2', explanation: 'There are two ways to climb to the top: 1 step + 1 step, and 2 steps.' },
      { input: 'n = 3', output: '3', explanation: '1+1+1, 1+2, 2+1' },
    ],
    starterCode: [
      { language: 'javascript', code: 'function climbStairs(n) {\n  // Your code here\n};' },
      { language: 'python', code: 'class Solution:\n    def climbStairs(self, n: int) -> int:\n        pass' },
    ],
    testCases: [
      { input: '2', expectedOutput: '2', isHidden: false },
      { input: '3', expectedOutput: '3', isHidden: false },
      { input: '45', expectedOutput: '1836311903', isHidden: true },
    ],
    acceptanceRate: 51.9,
    tags: ['dynamic-programming'],
  },
  {
    title: 'Merge Two Sorted Lists',
    slug: 'merge-two-sorted-lists',
    difficulty: 'easy',
    category: ['Linked List', 'Recursion'],
    description: 'You are given the heads of two sorted linked lists `list1` and `list2`.\n\nMerge the two lists into one sorted list. The list should be made by splicing together the nodes of the first two lists.\n\nReturn the head of the merged linked list.',
    constraints: 'The number of nodes in both lists is in the range [0, 50].\n-100 <= Node.val <= 100\nBoth list1 and list2 are sorted in non-decreasing order.',
    examples: [
      { input: 'list1 = [1,2,4], list2 = [1,3,4]', output: '[1,1,2,3,4,4]' },
      { input: 'list1 = [], list2 = []', output: '[]' },
    ],
    starterCode: [
      { language: 'javascript', code: 'function mergeTwoLists(list1, list2) {\n  // Your code here\n};' },
    ],
    testCases: [
      { input: '[1,2,4]\n[1,3,4]', expectedOutput: '[1,1,2,3,4,4]', isHidden: false },
      { input: '[]\n[]', expectedOutput: '[]', isHidden: false },
    ],
    acceptanceRate: 63.4,
    tags: ['linked-list'],
  },
  {
    title: 'Longest Palindromic Substring',
    slug: 'longest-palindromic-substring',
    difficulty: 'medium',
    category: ['String', 'Dynamic Programming'],
    description: 'Given a string `s`, return the longest palindromic substring in `s`.',
    constraints: '1 <= s.length <= 1000\ns consist of only digits and English letters.',
    examples: [
      { input: 's = "babad"', output: '"bab"', explanation: '"aba" is also a valid answer.' },
      { input: 's = "cbbd"', output: '"bb"' },
    ],
    starterCode: [
      { language: 'javascript', code: 'function longestPalindrome(s) {\n  // Your code here\n};' },
      { language: 'python', code: 'class Solution:\n    def longestPalindrome(self, s: str) -> str:\n        pass' },
    ],
    testCases: [
      { input: 'babad', expectedOutput: 'bab', isHidden: false },
      { input: 'cbbd', expectedOutput: 'bb', isHidden: false },
      { input: 'a', expectedOutput: 'a', isHidden: true },
    ],
    acceptanceRate: 32.6,
    tags: ['string', 'dynamic-programming'],
  },
];

async function seed() {
  console.log('🔧 Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);
  console.log('✅ Connected');

  let seeded = 0;
  for (const p of problems) {
    const exists = await CodingProblem.findOne({ slug: p.slug });
    if (exists) { console.log(`   ⏭ ${p.title} already exists`); continue; }
    await CodingProblem.create(p);
    console.log(`   ✅ ${p.title} (${p.difficulty})`);
    seeded++;
  }

  console.log(`\n🎉 Done! ${seeded} problems seeded.`);
  console.log('   Open http://localhost:5173/dashboard/playground to start coding!');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });
