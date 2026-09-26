import json
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QB_DIR = os.path.join(BASE_DIR, "backend", "data", "question_banks")
os.makedirs(QB_DIR, exist_ok=True)

QUESTION_BANKS = {
    "maths3": [
        {
            "id": "q_m01_1",
            "subject_id": "maths3",
            "concept_id": "M01",
            "text": "What is the determinant of a 2x2 matrix [[a, b], [c, d]]?",
            "options": ["ad + bc", "ad - bc", "ab - cd", "ac - bd"],
            "correct_answer": 1,
            "explanation": "By definition of a 2x2 determinant, det(A) = ad - bc.",
            "difficulty": 2
        },
        {
            "id": "q_m01_2",
            "subject_id": "maths3",
            "concept_id": "M01",
            "text": "If rank(A) = rank([A|B]) = number of unknowns in Ax = B, what is the system's nature?",
            "options": ["No solution", "Infinitely many solutions", "Unique solution", "Trivial solution only"],
            "correct_answer": 2,
            "explanation": "Rouché-Capelli theorem: When rank(A) = rank([A|B]) = n, the linear system has a unique consistent solution.",
            "difficulty": 3
        },
        {
            "id": "q_m02_1",
            "subject_id": "maths3",
            "concept_id": "M02",
            "text": "What theorem states that every square matrix satisfies its own characteristic equation?",
            "options": ["Euler's Theorem", "Cayley-Hamilton Theorem", "Green's Theorem", "Stokes' Theorem"],
            "correct_answer": 1,
            "explanation": "The Cayley-Hamilton theorem states that substituting A into its characteristic polynomial p(lambda) = det(A - lambda*I) yields the zero matrix p(A) = 0.",
            "difficulty": 4
        },
        {
            "id": "q_m03_1",
            "subject_id": "maths3",
            "concept_id": "M03",
            "text": "What is the integrating factor for the linear first-order ODE dy/dx + P(x)y = Q(x)?",
            "options": ["exp(integral P(x) dx)", "integral P(x) dx", "exp(-P(x))", "P(x) * Q(x)"],
            "correct_answer": 0,
            "explanation": "Multiplying the equation by e^(integral P(x)dx) converts the left side into the derivative of (y * e^(integral P(x)dx)).",
            "difficulty": 3
        },
        {
            "id": "q_m04_1",
            "subject_id": "maths3",
            "concept_id": "M04",
            "text": "What is the Laplace transform of the function f(t) = e^(at) for s > a?",
            "options": ["1 / s", "1 / (s - a)", "a / (s^2 + a^2)", "1 / (s + a)"],
            "correct_answer": 1,
            "explanation": "L{e^(at)} = integral_0^inf e^(-st) e^(at) dt = integral_0^inf e^(-(s-a)t) dt = 1/(s - a).",
            "difficulty": 4
        },
        {
            "id": "q_m05_1",
            "subject_id": "maths3",
            "concept_id": "M05",
            "text": "Under Dirichlet conditions, what value does a Fourier series converge to at a point of jump discontinuity x_0?",
            "options": ["0", "The maximum limit", "Average of left and right hand limits: (f(x0+) + f(x0-)) / 2", "Does not converge"],
            "correct_answer": 2,
            "explanation": "Dirichlet's theorem guarantees convergence to the arithmetic mean of the one-sided limits at any finite jump discontinuity.",
            "difficulty": 5
        },
        {
            "id": "q_m06_1",
            "subject_id": "maths3",
            "concept_id": "M06",
            "text": "The one-dimensional wave equation d^2u/dt^2 = c^2 (d^2u/dx^2) is classified as which type of PDE?",
            "options": ["Elliptic", "Parabolic", "Hyperbolic", "Nonlinear"],
            "correct_answer": 2,
            "explanation": "For B^2 - 4AC > 0, the second-order linear PDE is hyperbolic, which characterizes wave propagation.",
            "difficulty": 6
        },
        {
            "id": "q_m07_1",
            "subject_id": "maths3",
            "concept_id": "M07",
            "text": "What are the Cauchy-Riemann equations for an analytic function f(z) = u(x,y) + i*v(x,y)?",
            "options": ["du/dx = dv/dy and du/dy = -dv/dx", "du/dx = -dv/dy and du/dy = dv/dx", "du/dx = dv/dx and du/dy = dv/dy", "u^2 + v^2 = constant"],
            "correct_answer": 0,
            "explanation": "The CR equations du/dx = dv/dy and du/dy = -dv/dx are necessary conditions for complex differentiability.",
            "difficulty": 6
        }
    ],
    "automata_theory": [
        {
            "id": "q_at01_1",
            "subject_id": "automata_theory",
            "concept_id": "AT01",
            "text": "If alphabet Sigma = {0, 1}, what is the length of the empty string epsilon?",
            "options": ["0", "1", "Undefined", "Infinity"],
            "correct_answer": 0,
            "explanation": "By definition, the empty string epsilon has length |epsilon| = 0.",
            "difficulty": 1
        },
        {
            "id": "q_at02_1",
            "subject_id": "automata_theory",
            "concept_id": "AT02",
            "text": "In a Deterministic Finite Automaton (DFA), the transition function delta maps from:",
            "options": ["Q x Sigma -> Q", "Q x Sigma -> 2^Q", "Q -> Sigma", "2^Q x Sigma -> Q"],
            "correct_answer": 0,
            "explanation": "For every state q in Q and symbol a in Sigma, a DFA has exactly one deterministic target state delta(q, a) in Q.",
            "difficulty": 2
        },
        {
            "id": "q_at03_1",
            "subject_id": "automata_theory",
            "concept_id": "AT03",
            "text": "What is the maximum number of states in a DFA equivalent to an NFA with N states?",
            "options": ["N", "N^2", "2^N", "N!"],
            "correct_answer": 2,
            "explanation": "The power-set construction maps subsets of NFA states to DFA states, yielding at most 2^N states.",
            "difficulty": 3
        },
        {
            "id": "q_at04_1",
            "subject_id": "automata_theory",
            "concept_id": "AT04",
            "text": "Which property is proven using the Pumping Lemma for regular languages?",
            "options": ["That a language is regular", "That a language is non-regular (by contradiction)", "That an automaton has minimal states", "That a grammar is unambiguous"],
            "correct_answer": 1,
            "explanation": "The Pumping Lemma is a necessary property of regular languages; failing it proves a language is NOT regular.",
            "difficulty": 4
        },
        {
            "id": "q_at05_1",
            "subject_id": "automata_theory",
            "concept_id": "AT05",
            "text": "In Chomsky Normal Form (CNF), all production rules must be of which forms?",
            "options": ["A -> BC or A -> a", "A -> aB or A -> a", "A -> alpha B beta", "A -> aBC"],
            "correct_answer": 0,
            "explanation": "In CNF, every production rule yields either exactly two non-terminals (A -> BC) or a single terminal (A -> a).",
            "difficulty": 4
        },
        {
            "id": "q_at06_1",
            "subject_id": "automata_theory",
            "concept_id": "AT06",
            "text": "What auxiliary memory structure equips a Pushdown Automaton (PDA) beyond a finite state control?",
            "options": ["Queue (FIFO)", "Stack (LIFO)", "Random Access Array", "Two-way Infinite Tape"],
            "correct_answer": 1,
            "explanation": "A PDA is a finite automaton augmented with an unbounded LIFO stack.",
            "difficulty": 5
        },
        {
            "id": "q_at07_1",
            "subject_id": "automata_theory",
            "concept_id": "AT07",
            "text": "The Halting Problem for Turing Machines is:",
            "options": ["Decidable in polynomial time", "Undecidable / semi-decidable", "Decidable in exponential time", "Trivially solvable"],
            "correct_answer": 1,
            "explanation": "Alan Turing proved in 1936 via diagonalization that no general algorithm can decide if an arbitrary program halts on an arbitrary input.",
            "difficulty": 7
        }
    ],
    "adsa": [
        {
            "id": "q_ds01_1",
            "subject_id": "adsa",
            "concept_id": "DS01",
            "text": "What is the solution to recurrence T(N) = 2T(N/2) + O(N) by the Master Theorem?",
            "options": ["O(N)", "O(N log N)", "O(N^2)", "O(log N)"],
            "correct_answer": 1,
            "explanation": "Here a=2, b=2, k=1. Since log_b(a) = log_2(2) = 1 = k, by Case 2 of Master Theorem, T(N) = O(N^k log N) = O(N log N).",
            "difficulty": 2
        },
        {
            "id": "q_ds02_1",
            "subject_id": "adsa",
            "concept_id": "DS02",
            "text": "In an AVL tree, what is the maximum allowed difference in heights of left and right subtrees for any node?",
            "options": ["0", "1", "2", "log N"],
            "correct_answer": 1,
            "explanation": "An AVL tree maintains the balance factor BF = height(left) - height(right) in {-1, 0, 1}.",
            "difficulty": 4
        },
        {
            "id": "q_ds03_1",
            "subject_id": "adsa",
            "concept_id": "DS03",
            "text": "Why are B-Trees preferred over Binary Search Trees for disk-based database indexes?",
            "options": ["They use less memory", "High branching factor reduces tree height and minimizes expensive disk block I/O reads", "They only store integers", "They do not require balancing"],
            "correct_answer": 1,
            "explanation": "With large fanout (e.g. hundreds of keys per node), B-tree height stays small (2-3 levels), vastly reducing slow disk seeks.",
            "difficulty": 5
        },
        {
            "id": "q_ds04_1",
            "subject_id": "adsa",
            "concept_id": "DS04",
            "text": "Which algorithm finds all-pairs shortest paths in a directed weighted graph with O(V^3) time complexity?",
            "options": ["Dijkstra's Algorithm", "Bellman-Ford", "Floyd-Warshall Algorithm", "Kruskal's Algorithm"],
            "correct_answer": 2,
            "explanation": "Floyd-Warshall computes shortest paths between all pairs using dynamic programming in O(V^3) time.",
            "difficulty": 4
        },
        {
            "id": "q_ds05_1",
            "subject_id": "adsa",
            "concept_id": "DS05",
            "text": "What data structure enables Kruskal's MST algorithm to check if an edge forms a cycle in nearly O(1) amortized time?",
            "options": ["Priority Queue", "Disjoint Set Union (Union-Find) with path compression", "Adjacency Matrix", "Fenwick Tree"],
            "correct_answer": 1,
            "explanation": "Union-Find with union-by-rank and path compression runs in O(alpha(V)) near-constant amortized time.",
            "difficulty": 4
        },
        {
            "id": "q_ds06_1",
            "subject_id": "adsa",
            "concept_id": "DS06",
            "text": "In Matrix Chain Multiplication of matrices A1..An, what is the recurrence for optimal cost m[i, j]?",
            "options": ["min_k { m[i,k] + m[k+1,j] + p_{i-1}*p_k*p_j }", "m[i,j-1] + m[i+1,j]", "max_k { m[i,k] * m[k+1,j] }", "O(N!) naive product"],
            "correct_answer": 0,
            "explanation": "Matrix chain DP optimizes the split point k between i and j by summing the subproblems plus scalar multiplications.",
            "difficulty": 6
        },
        {
            "id": "q_ds07_1",
            "subject_id": "adsa",
            "concept_id": "DS07",
            "text": "If an NP-Complete problem can be solved in deterministic polynomial time (P), what follows?",
            "options": ["P = NP", "P != NP", "NP becomes empty", "Only that problem is fast"],
            "correct_answer": 0,
            "explanation": "Because all problems in NP reduce to any NP-complete problem in polynomial time, solving any one NP-complete problem in P proves P = NP.",
            "difficulty": 7
        }
    ],
    "java": [
        {
            "id": "q_j01_1",
            "subject_id": "java",
            "concept_id": "J01",
            "text": "Which access modifier restricts member visibility strictly to the declaring class?",
            "options": ["public", "protected", "default (package-private)", "private"],
            "correct_answer": 3,
            "explanation": "private variables and methods are only accessible within the enclosing class body.",
            "difficulty": 2
        },
        {
            "id": "q_j02_1",
            "subject_id": "java",
            "concept_id": "J02",
            "text": "What happens during runtime dynamic method dispatch when calling a method on an overridden instance?",
            "options": ["Calls reference type version", "Calls actual object runtime type version", "Throws ClassCastException", "Compiles to static call"],
            "correct_answer": 1,
            "explanation": "Java resolves overridden non-static methods dynamically at runtime based on the actual object instance type in heap memory.",
            "difficulty": 3
        },
        {
            "id": "q_j03_1",
            "subject_id": "java",
            "concept_id": "J03",
            "text": "Which of the following is an UNCHECKED exception in Java?",
            "options": ["IOException", "SQLException", "NullPointerException", "ClassNotFoundException"],
            "correct_answer": 2,
            "explanation": "Subclasses of RuntimeException (like NullPointerException, ArrayIndexOutOfBoundsException) are unchecked.",
            "difficulty": 3
        },
        {
            "id": "q_j04_1",
            "subject_id": "java",
            "concept_id": "J04",
            "text": "What underlying data structure does standard Java HashMap (Java 8+) use when a bucket exceeds 8 collision elements?",
            "options": ["LinkedList", "Red-Black Balanced Tree (TreeNode)", "ArrayList", "Circular Buffer"],
            "correct_answer": 1,
            "explanation": "Java 8 converts linked list buckets into balanced red-black trees when the treeify threshold of 8 is crossed, improving collision lookup from O(N) to O(log N).",
            "difficulty": 4
        },
        {
            "id": "q_j05_1",
            "subject_id": "java",
            "concept_id": "J05",
            "text": "What is the effect of Java Generics Type Erasure at runtime?",
            "options": ["Types are preserved and checked at runtime", "Type arguments are erased and replaced by their bounds (or Object) in bytecode", "Generics generate separate class files for each type", "Static types throw errors"],
            "correct_answer": 1,
            "explanation": "Type erasure removes parameter types at compile time, ensuring backward compatibility with older pre-generics JVM versions.",
            "difficulty": 5
        },
        {
            "id": "q_j06_1",
            "subject_id": "java",
            "concept_id": "J06",
            "text": "What does the 'volatile' keyword guarantee in Java multi-threaded execution?",
            "options": ["Atomicity of compound operations (i++)", "Visibility: reads and writes bypass CPU cache directly to main memory", "Thread sleeping", "Automatic deadlock prevention"],
            "correct_answer": 1,
            "explanation": "volatile establishes a happens-before relationship ensuring all threads observe the freshest value from main memory.",
            "difficulty": 6
        },
        {
            "id": "q_j07_1",
            "subject_id": "java",
            "concept_id": "J07",
            "text": "In the JVM generational memory architecture, where are short-lived objects primarily allocated?",
            "options": ["Old / Tenured Generation", "Eden Space in Young Generation", "Metaspace", "Native Method Stack"],
            "correct_answer": 1,
            "explanation": "New objects are instantiated in Eden space; survivors of Minor GC passes are promoted to Survivor spaces and eventually Tenured generation.",
            "difficulty": 7
        }
    ],
    "c_programming": [
        {
            "id": "q_c01_1",
            "subject_id": "c_programming",
            "concept_id": "C01",
            "text": "What is the result of 5 & 3 in C bitwise operations?",
            "options": ["1", "7", "2", "8"],
            "correct_answer": 0,
            "explanation": "5 is 0101 in binary, 3 is 0011. 0101 & 0011 = 0001 which is 1.",
            "difficulty": 2
        },
        {
            "id": "q_c02_1",
            "subject_id": "c_programming",
            "concept_id": "C02",
            "text": "In C, function arguments are passed by:",
            "options": ["Reference", "Value (copies are passed)", "Pointer automatically", "Name"],
            "correct_answer": 1,
            "explanation": "C is strictly call-by-value. To simulate call-by-reference, the address (pointer) is passed by value.",
            "difficulty": 2
        },
        {
            "id": "q_c03_1",
            "subject_id": "c_programming",
            "concept_id": "C03",
            "text": "What is the terminator character for valid C string literals in memory?",
            "options": ["'\\n'", "'\\0' (NULL character)", "'EOF'", "';'"],
            "correct_answer": 1,
            "explanation": "C strings are null-terminated character sequences ending with byte 0x00 ('\\0').",
            "difficulty": 3
        },
        {
            "id": "q_c04_1",
            "subject_id": "c_programming",
            "concept_id": "C04",
            "text": "If int *p = arr; where arr is an int array, what does *(p + 2) evaluate to?",
            "options": ["arr[2]", "arr[0] + 2", "Address of arr + 2 bytes", "Syntax Error"],
            "correct_answer": 0,
            "explanation": "Pointer arithmetic scales by sizeof(int). *(p + 2) is mathematically identical to arr[2].",
            "difficulty": 4
        },
        {
            "id": "q_c05_1",
            "subject_id": "c_programming",
            "concept_id": "C05",
            "text": "What dangerous condition occurs when accessing memory through a pointer after calling free(ptr)?",
            "options": ["Memory leak", "Dangling pointer access / Use-After-Free", "Stack overflow", "Buffer overfill"],
            "correct_answer": 1,
            "explanation": "The pointer still holds the deallocated heap address. Dereferencing it is a dangling pointer access resulting in undefined behavior.",
            "difficulty": 5
        },
        {
            "id": "q_c06_1",
            "subject_id": "c_programming",
            "concept_id": "C06",
            "text": "How do C union members share memory compared to struct members?",
            "options": ["Each member has separate memory", "All members share the same base memory location, sized to the largest member", "Unions allocate on stack only", "Unions cannot hold pointers"],
            "correct_answer": 1,
            "explanation": "A union allocates memory equal to its largest member, and all members overlap at the same starting address.",
            "difficulty": 5
        },
        {
            "id": "q_c07_1",
            "subject_id": "c_programming",
            "concept_id": "C07",
            "text": "Which preprocessor directive prevents duplicate inclusion of header files in C compilation?",
            "options": ["#include <once>", "#pragma once or #ifndef header guards", "#define STRICT", "#import"],
            "correct_answer": 1,
            "explanation": "#ifndef HEADER_H / #define HEADER_H guards or #pragma once prevent circular and duplicate header inclusions.",
            "difficulty": 6
        }
    ],
    "python": [
        {
            "id": "q_p01_1",
            "subject_id": "python",
            "concept_id": "P01",
            "text": "Which of the following data types is immutable in Python?",
            "options": ["list", "dict", "tuple", "set"],
            "correct_answer": 2,
            "explanation": "Tuples, strings, and integers are immutable in Python; lists, dicts, and sets can be mutated in-place.",
            "difficulty": 2
        },
        {
            "id": "q_p02_1",
            "subject_id": "python",
            "concept_id": "P02",
            "text": "What does expression: [] or 'fallback' evaluate to in Python?",
            "options": ["[]", "True", "'fallback'", "None"],
            "correct_answer": 2,
            "explanation": "In short-circuit boolean logic, empty list [] is falsy, so 'or' returns the first truthy operand 'fallback'.",
            "difficulty": 2
        },
        {
            "id": "q_p03_1",
            "subject_id": "python",
            "concept_id": "P03",
            "text": "What keyword turns a standard Python function into a generator object?",
            "options": ["generate", "yield", "return async", "iterate"],
            "correct_answer": 1,
            "explanation": "The yield keyword produces values lazily one at a time and maintains execution state between calls.",
            "difficulty": 3
        },
        {
            "id": "q_p04_1",
            "subject_id": "python",
            "concept_id": "P04",
            "text": "What does the LEGB rule stand for in Python identifier resolution?",
            "options": ["Loop, Expression, Global, Block", "Local, Enclosing, Global, Built-in", "Logical, Explicit, Generic, Base", "Lambda, Execution, Group, Binding"],
            "correct_answer": 1,
            "explanation": "Python searches namespaces in strict LEGB order: Local -> Enclosing -> Global -> Built-in.",
            "difficulty": 3
        },
        {
            "id": "q_p05_1",
            "subject_id": "python",
            "concept_id": "P05",
            "text": "What is the average time complexity of a key lookup in a Python dictionary?",
            "options": ["O(1) amortized", "O(N)", "O(log N)", "O(N^2)"],
            "correct_answer": 0,
            "explanation": "Python dictionaries are implemented as optimized open-addressed hash tables with amortized O(1) average lookup time.",
            "difficulty": 4
        },
        {
            "id": "q_p06_1",
            "subject_id": "python",
            "concept_id": "P06",
            "text": "What error occurs if a recursive function in Python lacks a terminating base case?",
            "options": ["MemoryError", "RecursionError: maximum recursion depth exceeded", "StackLeakException", "ZeroDivisionError"],
            "correct_answer": 1,
            "explanation": "Python limits recursive calls (default 1000 frames) to protect the C call stack, raising RecursionError upon overflow.",
            "difficulty": 5
        },
        {
            "id": "q_p07_1",
            "subject_id": "python",
            "concept_id": "P07",
            "text": "What algorithm does Python 3 use for Method Resolution Order (MRO) in multiple inheritance?",
            "options": ["Depth-First Search", "C3 Superconcurrency Linearization", "Breadth-First Search", "Random Selection"],
            "correct_answer": 1,
            "explanation": "Python uses the C3 Linearization algorithm to determine monotonic inheritance hierarchy order.",
            "difficulty": 6
        }
    ]
}

for sub_id, questions in QUESTION_BANKS.items():
    out_file = os.path.join(QB_DIR, f"{sub_id}.json")
    with open(out_file, "w") as f:
        json.dump(questions, f, indent=2)
    print(f"Wrote {len(questions)} questions to {out_file}")

print("All 6 initial question banks generated successfully!")
