/**
 * Update starter code for all problems to include I/O handling.
 * Run: npx ts-node --project tsconfig.json src/scripts/updateStarterCode.ts
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { CodingProblem } from '../models/CodingProblem';

const STARTERS: Record<string, Record<string, string>> = {
  'two-sum': {
    javascript: `// Two Sum — read input, solve, print output
const nums = readArray();   // reads: [2,7,11,15]
const target = readInt();   // reads: 9

function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) return [map.get(complement), i];
    map.set(nums[i], i);
  }
  return [];
}

console.log(JSON.stringify(twoSum(nums, target)));`,

    python: `import json, sys

line1 = input().strip()
nums = json.loads(line1)
target = int(input().strip())

def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        comp = target - num
        if comp in seen:
            return [seen[comp], i]
        seen[num] = i
    return []

print(twoSum(nums, target))`,
  },

  'valid-parentheses': {
    javascript: `const s = readline();  // reads: "()"

function isValid(s) {
  const stack = [];
  const map = { ')': '(', '}': '{', ']': '[' };
  for (const c of s) {
    if ('([{'.includes(c)) stack.push(c);
    else if (stack.pop() !== map[c]) return false;
  }
  return stack.length === 0;
}

console.log(isValid(s));`,

    python: `s = input().strip()

def isValid(s):
    stack = []
    mapping = {')': '(', '}': '{', ']': '['}
    for c in s:
        if c in '([{':
            stack.append(c)
        elif not stack or stack[-1] != mapping[c]:
            return False
        else:
            stack.pop()
    return not stack

print(str(isValid(s)).lower())`,
  },

  'maximum-subarray': {
    javascript: `const nums = readArray();  // reads: [-2,1,-3,4,-1,2,1,-5,4]

function maxSubArray(nums) {
  let maxSum = nums[0], currentSum = nums[0];
  for (let i = 1; i < nums.length; i++) {
    currentSum = Math.max(nums[i], currentSum + nums[i]);
    maxSum = Math.max(maxSum, currentSum);
  }
  return maxSum;
}

console.log(maxSubArray(nums));`,

    python: `import json
nums = json.loads(input())

def maxSubArray(nums):
    max_sum = current_sum = nums[0]
    for num in nums[1:]:
        current_sum = max(num, current_sum + num)
        max_sum = max(max_sum, current_sum)
    return max_sum

print(maxSubArray(nums))`,
  },

  'binary-search': {
    javascript: `const nums = readArray();
const target = readInt();

function search(nums, target) {
  let left = 0, right = nums.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

console.log(search(nums, target));`,

    python: `import json
nums = json.loads(input())
target = int(input())

def search(nums, target):
    left, right = 0, len(nums) - 1
    while left <= right:
        mid = (left + right) // 2
        if nums[mid] == target: return mid
        elif nums[mid] < target: left = mid + 1
        else: right = mid - 1
    return -1

print(search(nums, target))`,
  },

  'climbing-stairs': {
    javascript: `const n = readInt();

function climbStairs(n) {
  if (n <= 2) return n;
  let a = 1, b = 2;
  for (let i = 3; i <= n; i++) {
    [a, b] = [b, a + b];
  }
  return b;
}

console.log(climbStairs(n));`,

    python: `n = int(input())

def climbStairs(n):
    if n <= 2: return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b

print(climbStairs(n))`,
  },
};

// Generic starter for problems without specific starters
const GENERIC_JS = (title: string) => `// ${title}
// Use readline() to read input, console.log() to print output
// Helpers: readInt(), readArray(), readLine()

const input1 = readline();  // first line of input
// const input2 = readInt();  // second line as integer
// const arr = readArray();   // line as JSON array

// Write your solution here
function solve(input) {
  // Your code here
  return null;
}

const result = solve(input1);
if (result !== null) console.log(JSON.stringify(result));`;

async function updateStarters() {
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected. Updating starter code...');

  const problems = await CodingProblem.find({});

  for (const problem of problems) {
    const slugStarters = STARTERS[problem.slug];
    const newCode: Array<{ language: string; code: string }> = [];

    for (const lang of ['javascript', 'python', 'java', 'cpp']) {
      const specific = slugStarters?.[lang];
      if (specific) {
        newCode.push({ language: lang, code: specific });
      } else if (lang === 'javascript') {
        newCode.push({ language: lang, code: GENERIC_JS(problem.title) });
      }
    }

    if (newCode.length > 0) {
      await CodingProblem.findByIdAndUpdate(problem._id, { starterCode: newCode });
      console.log(`  ✅ Updated: ${problem.title}`);
    }
  }

  console.log('\nDone! Starter code updated with I/O templates.');
  await mongoose.disconnect();
  process.exit(0);
}

updateStarters().catch(err => { console.error(err); process.exit(1); });
