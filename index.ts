import { Snowflake } from "@theinternetfolks/snowflake";

type Vertex = {
	_id: string;
	_in: string[];
	_out: string[];
};

type Edge = {
	_id: string;
	_in: Vertex | null;
	_out: Vertex | null;
};

type state = {
	vertices : Vertex[];

};

type step = any;
type QueryBasic = {
	graph: typeof SAMSA.G;
	state: state[];
	program: step[];
	gremlins: any[];
	add: (pipetype: string, ...args: any[]) => QueryBasic;
};

type Query = QueryBasic & Record<string, Function | any>;

type Graph = {
	vertices: Vertex[];
	edges: Edge[];
};

type SAMSA = {
	G: {
		vertices: Vertex[];
		edges: Edge[];

		addVertices: (Vertices: any[]) => Error | void;
		addEdges: (Edges: any[]) => Error | void;

		addVertex: (Vertex: any) => string | Error;
		addEdge: (Edge: Edge) => string | Error;

		findVertexById: (id: Vertex["_id"]) => Vertex | null;
		VertexIndex: VertexIndexType;
		v?: () => Query;
	};

	graph: (V: any[], E: any[]) => Graph;
	Q: Query;
	query: (graph: Graph) => Query;
	Pipetype: Record<string, Function>;
	addPipetype: (name: string, fnc: Function) => void;
	getPipetype: (name: string) => Function;
	fauxPipetype?: Function;
};

type VertexIndexType = { [key: string]: Vertex };
type EdgeIndexType = { [key: string]: Edge };

const SAMSA: SAMSA = {
	G: {
		vertices: [] as Vertex[],
		edges: [] as Edge[],
		addVertices: (Vertices: any[]) => {
			throw new Error("Not implemented yet the addVertices function");
		},
		addEdges: (Edges: any[]) => {
			throw new Error("Not implemented yet the addEdges function");
		},
		addVertex: (Vertex: any) => {
			throw new Error("Not implemented yet the addVertex function");
		},
		addEdge: (Edge: Edge) => {
			throw new Error("Not implemented yet the addEdge function");
		},
		findVertexById: function (id: Vertex["_id"]) {
			throw new Error("Not implemented yet the findVertexById function");
		},
		VertexIndex: {} as VertexIndexType,
	},
	graph: (V: any[], E: any[]) => {
		throw new Error("Not implemented yet the graph function");
	},

	Q: {} as Query,

	query: (graph: Graph) => {
		throw new Error("Not implemented yet the query function");
	},
	Pipetype: Object.create(null),
	addPipetype: function (name, fnc) {
		//The pipetype's function is added to the list
		//of pipetypes, and then a new method is added to the query
		//object.Every pipetype must have a corresponding query method.That
		//method adds a new step to the query program, along with its arguments.
		this.Pipetype[name] = fnc;
		this.Q[name] = function () {
			return this.add(name, [].slice.apply(arguments));
		};
	},

	getPipetype: function (name) {
		var pipetype = this.Pipetype[name];
		if (!pipetype) throw new Error("No pipetype with that name exists");
		return pipetype || SAMSA.fauxPipetype;
	},
};

SAMSA.G = {
	vertices: [],
	edges: [],
	VertexIndex: {},
	addVertices: function (Vertices: any[]) {
		Vertices.forEach(this.addVertex.bind(this));
	},
	addEdges: function (Edges: any[]) {
		Edges.forEach(this.addEdge.bind(this));
	},
	// passing an object coz we want runtime access to the vertex
	/** @param {Vertex} Vertex */
	addVertex: function (Vertex: Vertex) {
		if (!Vertex._id) {
			return Error("Vertex must have an id");
		} else if (this.findVertexById(Vertex._id)) return Error("A vertex with that ID already exists");
		this.vertices.push(Vertex);
		this.VertexIndex[Vertex._id] = Vertex;
		Vertex._in = [];
		Vertex._out = [];
		return Vertex._id;
	},
	addEdge: function (Edge: Edge) {
		const new_edge = Edge;

		if (!Edge._id || !Edge._in || !Edge._out) {
			return Error("Edge must have an id");
		}
		// find the vertices that the edge connects . if they don't exist, return an error
		new_edge._in = this.findVertexById(Edge._in._id);
		new_edge._out = this.findVertexById(Edge._out._id);

		if (!(new_edge._in && new_edge._out)) return Error("That edge's " + (new_edge._in ? "out" : "in") + " vertex wasn't found");

		// add the edge to the vertices , because they are connected , hopefully
		new_edge._out._out.push(Edge._id);
		new_edge._in._in.push(Edge._id);
		// add the edge to the graph object
		this.edges.push(new_edge);
		return new_edge._id;
	},

	findVertexById: function (id: Vertex["_id"]) {
		if (!this.vertices) return null;

		const vertex = this.vertices.find((v) => v._id === id);
		if (!vertex) return null;
		return vertex;
	},
};

SAMSA.graph = function (V, E) {
	var gph = Object.create(SAMSA.G);
	gph.edges = [];
	gph.vertices = [];
	gph.VertexIndex = {};
	gph.autoId = Snowflake.generate();
	if (Array.isArray(V)) {
		gph.addVertices(V);
	}
	if (Array.isArray(E)) {
		gph.addEdges(E);
	}
	return gph;
};

// BLUEPRINT OF A QUERY ... KINDA :  g.v('Thor').out().out().out().in().in().in()
SAMSA.query = function (graph: Graph) {
	var query = Object.create(SAMSA.Q);
	query.graph = graph;
	query.state = [];
	//A program is a series of steps. Each step is like a pipe in a pipeline—a piece of data comes in one end, is transformed in some fashion, and goes out the other end.
	query.program = [];
	//Each step in our program can have state, and query.state is a list of per-step states that index correlates with the list of steps in query.program.
	query.gremlins = [];
	// a gremlin is a function that takes a state and a graph and returns a new state . essentially does things for us lol.
	return query;
};

SAMSA.Q.add = function (pipetype, ...args) {
	var step = [pipetype, ...args];
	this.program.push(step);
	return this;
};

SAMSA.G.v = function () {
	var query = SAMSA.query(this);
	query.add("vertex", [].slice.call(arguments));
	return query;
};

SAMSA.fauxPipetype = function (_: any, _2: any, maybe_gremlin: any) {
	return maybe_gremlin || "pull";
};


SAMSA.addPipetype("vertex", function (grph: Graph, state: state, gremlin: Function, ...args: any[]) {
	if (!state.vertices) {
		state.vertices = grph.vertices
	}
	
});


