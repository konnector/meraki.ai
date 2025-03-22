/**
 * Cell dependency tracking for formula evaluation
 * Manages dependencies between cells and determines recalculation order
 */

/**
 * Directed graph to track dependencies between cells
 */
export class DependencyGraph {
  // Map from a cell to all cells that depend on it
  private dependencies: Map<string, Set<string>> = new Map();
  
  // Map from a cell to all cells it depends on
  private dependsOn: Map<string, Set<string>> = new Map();
  
  /**
   * Add a dependency from one cell to another
   * @param dependent Cell that depends on the dependency
   * @param dependency Cell that the dependent depends on
   */
  public addDependency(dependent: string, dependency: string): void {
    // Skip self-dependencies
    if (dependent === dependency) {
      return;
    }
    
    // Add to dependencies map (dependency -> dependent)
    if (!this.dependencies.has(dependency)) {
      this.dependencies.set(dependency, new Set());
    }
    this.dependencies.get(dependency)!.add(dependent);
    
    // Add to dependsOn map (dependent -> dependency)
    if (!this.dependsOn.has(dependent)) {
      this.dependsOn.set(dependent, new Set());
    }
    this.dependsOn.get(dependent)!.add(dependency);
  }
  
  /**
   * Remove all dependencies for a cell
   * @param cellId Cell to clear dependencies for
   */
  public clearDependencies(cellId: string): void {
    // Remove from dependsOn map
    if (this.dependsOn.has(cellId)) {
      // For each dependency of this cell, remove this cell from its dependents
      for (const dependency of this.dependsOn.get(cellId)!) {
        if (this.dependencies.has(dependency)) {
          this.dependencies.get(dependency)!.delete(cellId);
        }
      }
      this.dependsOn.delete(cellId);
    }
    
    // Remove from dependencies map
    if (this.dependencies.has(cellId)) {
      this.dependencies.delete(cellId);
    }
  }
  
  /**
   * Get all cells that depend on a given cell
   * @param cellId Cell to get dependents for
   * @returns Array of cell IDs that depend on the input cell
   */
  public getDependents(cellId: string): string[] {
    return this.dependencies.has(cellId) 
      ? Array.from(this.dependencies.get(cellId)!)
      : [];
  }
  
  /**
   * Get all cells that a given cell depends on
   * @param cellId Cell to get dependencies for
   * @returns Array of cell IDs that the input cell depends on
   */
  public getDependencies(cellId: string): string[] {
    return this.dependsOn.has(cellId)
      ? Array.from(this.dependsOn.get(cellId)!)
      : [];
  }
  
  /**
   * Check if there would be a circular dependency if the given dependency were added
   * @param dependent Cell that would depend on the dependency
   * @param dependency Cell that would be depended on
   * @returns True if adding this dependency would create a circular reference
   */
  public wouldCreateCircularDependency(dependent: string, dependency: string): boolean {
    // Self-dependency is always circular
    if (dependent === dependency) {
      return true;
    }
    
    // If the dependency already depends on the dependent (directly or indirectly),
    // this would create a circular dependency
    return this.isDependent(dependency, dependent, new Set());
  }
  
  /**
   * Check if one cell depends on another, directly or indirectly
   * @param cellId Cell to check dependencies for
   * @param targetId Cell to check if it's a dependency
   * @param visited Set of cells already visited to avoid infinite loops
   * @returns True if cellId depends on targetId
   */
  private isDependent(cellId: string, targetId: string, visited: Set<string>): boolean {
    // If we've already visited this cell, stop to avoid cycles
    if (visited.has(cellId)) {
      return false;
    }
    
    // Mark this cell as visited
    visited.add(cellId);
    
    // Check direct dependencies
    if (!this.dependsOn.has(cellId)) {
      return false;
    }
    
    // If targetId is a direct dependency, we have a match
    if (this.dependsOn.get(cellId)!.has(targetId)) {
      return true;
    }
    
    // Check indirect dependencies
    for (const dependency of this.dependsOn.get(cellId)!) {
      if (this.isDependent(dependency, targetId, visited)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Get cells in topological sort order (dependency first)
   * @returns Array of cell IDs in calculated order
   */
  public getTopologicalSort(): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();
    
    // Get all cells in the graph
    const allCells = new Set<string>();
    for (const cell of this.dependencies.keys()) {
      allCells.add(cell);
    }
    for (const cell of this.dependsOn.keys()) {
      allCells.add(cell);
    }
    
    // Visit each unvisited cell
    for (const cell of allCells) {
      if (!visited.has(cell)) {
        this.visit(cell, visited, temp, result);
      }
    }
    
    // Reverse for correct order (dependencies before dependents)
    return result.reverse();
  }
  
  /**
   * Visit a cell for topological sort
   * @param cellId Cell to visit
   * @param visited Set of cells already fully visited
   * @param temp Set of cells currently being visited (for cycle detection)
   * @param result Array to add cells to in post-order
   */
  private visit(
    cellId: string,
    visited: Set<string>,
    temp: Set<string>,
    result: string[]
  ): void {
    // If we've already fully visited this cell, we're done
    if (visited.has(cellId)) {
      return;
    }
    
    // If we're currently visiting this cell, we have a cycle
    if (temp.has(cellId)) {
      throw new Error(`Circular dependency detected involving cell ${cellId}`);
    }
    
    // Mark cell as being visited
    temp.add(cellId);
    
    // Visit all dependencies first
    if (this.dependsOn.has(cellId)) {
      for (const dependency of this.dependsOn.get(cellId)!) {
        this.visit(dependency, visited, temp, result);
      }
    }
    
    // Mark cell as fully visited
    temp.delete(cellId);
    visited.add(cellId);
    
    // Add to result
    result.push(cellId);
  }
  
  /**
   * Get cells that need to be recalculated when a cell changes
   * @param cellId Cell that has changed
   * @returns Array of cell IDs that need to be recalculated, in the correct order
   */
  public getRecalculationOrder(cellId: string): string[] {
    // Start with all cells that depend on the changed cell
    const toRecalculate = new Set<string>();
    
    // Add the cell itself
    toRecalculate.add(cellId);
    
    // Get all dependents of the cell, recursively
    this.addDependentsRecursively(cellId, toRecalculate);
    
    // Sort cells in topological order
    return this.topologicalSortSubset(toRecalculate);
  }
  
  /**
   * Add all dependents of a cell to a set, recursively
   * @param cellId Cell to get dependents for
   * @param result Set to add dependents to
   */
  private addDependentsRecursively(cellId: string, result: Set<string>): void {
    const dependents = this.getDependents(cellId);
    
    for (const dependent of dependents) {
      // If already in the set, skip to avoid infinite recursion
      if (result.has(dependent)) {
        continue;
      }
      
      // Add the dependent to the set
      result.add(dependent);
      
      // Add all cells that depend on this dependent
      this.addDependentsRecursively(dependent, result);
    }
  }
  
  /**
   * Topologically sort a subset of cells
   * @param cells Set of cells to sort
   * @returns Array of cells in topological sort order
   */
  private topologicalSortSubset(cells: Set<string>): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();
    
    // Visit each unvisited cell in the subset
    for (const cell of cells) {
      if (!visited.has(cell)) {
        this.visitSubset(cell, visited, temp, result, cells);
      }
    }
    
    // Reverse for correct order (dependencies before dependents)
    return result.reverse();
  }
  
  /**
   * Visit a cell for topological sort of a subset
   * @param cellId Cell to visit
   * @param visited Set of cells already fully visited
   * @param temp Set of cells currently being visited (for cycle detection)
   * @param result Array to add cells to in post-order
   * @param subset Set of cells to consider
   */
  private visitSubset(
    cellId: string,
    visited: Set<string>,
    temp: Set<string>,
    result: string[],
    subset: Set<string>
  ): void {
    // If we've already fully visited this cell, we're done
    if (visited.has(cellId)) {
      return;
    }
    
    // If we're currently visiting this cell, we have a cycle
    if (temp.has(cellId)) {
      throw new Error(`Circular dependency detected involving cell ${cellId}`);
    }
    
    // Mark cell as being visited
    temp.add(cellId);
    
    // Visit all dependencies that are in the subset
    if (this.dependsOn.has(cellId)) {
      for (const dependency of this.dependsOn.get(cellId)!) {
        if (subset.has(dependency)) {
          this.visitSubset(dependency, visited, temp, result, subset);
        }
      }
    }
    
    // Mark cell as fully visited
    temp.delete(cellId);
    visited.add(cellId);
    
    // Add to result
    result.push(cellId);
  }
} 