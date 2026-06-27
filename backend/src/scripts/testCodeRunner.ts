import { CodeRunner } from '../services/codeRunner.service';

async function test() {
  console.log('Testing local code runner...\n');

  // Test JavaScript
  const jsResult = await CodeRunner.run(
    `const nums = JSON.parse(input());
const target = parseInt(input());
const map = new Map();
for (let i = 0; i < nums.length; i++) {
  const comp = target - nums[i];
  if (map.has(comp)) { console.log(JSON.stringify([map.get(comp), i])); return; }
  map.set(nums[i], i);
}`,
    'javascript',
    '[2,7,11,15]\n9'
  );
  console.log('JS Result:', jsResult.stdout, '| Status:', jsResult.status.description);

  // Test Python
  const pyResult = await CodeRunner.run(
    `nums = list(map(int, input().strip('[]').split(',')))
target = int(input())
seen = {}
for i, n in enumerate(nums):
    comp = target - n
    if comp in seen:
        print([seen[comp], i])
        break
    seen[n] = i`,
    'python',
    '[2,7,11,15]\n9'
  );
  console.log('Python Result:', pyResult.stdout || pyResult.stderr, '| Status:', pyResult.status.description);
}

test().catch(console.error);
