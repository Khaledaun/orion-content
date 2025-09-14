/**
 * Enterprise Service Container
 * Phase 1 Enhancement: Dependency injection and service management
 */

import { logger } from "@/lib/logger";

type ServiceFactory<T = any> = () => T | Promise<T>;
type ServiceInstance<T = any> = T;

interface ServiceDefinition<T = any> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  dependencies: string[];
  lifecycle: "transient" | "singleton" | "scoped";
  tags: string[];
}

interface ServiceMetadata {
  name: string;
  createdAt: Date;
  lastAccessed: Date;
  accessCount: number;
  instance?: any;
}

export class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, ServiceDefinition> = new Map();
  private instances: Map<string, ServiceInstance> = new Map();
  private metadata: Map<string, ServiceMetadata> = new Map();
  private scopes: Map<string, Map<string, ServiceInstance>> = new Map();

  private constructor() {
    this.setupBuiltinServices();
  }

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  public register<T>(
    name: string,
    factory: ServiceFactory<T>,
    options: {
      singleton?: boolean;
      dependencies?: string[];
      lifecycle?: "transient" | "singleton" | "scoped";
      tags?: string[];
    } = {},
  ): ServiceContainer {
    const definition: ServiceDefinition<T> = {
      factory,
      singleton: options.singleton ?? true,
      dependencies: options.dependencies || [],
      lifecycle:
        options.lifecycle ||
        (options.singleton !== false ? "singleton" : "transient"),
      tags: options.tags || [],
    };

    this.services.set(name, definition);

    // Initialize metadata
    this.metadata.set(name, {
      name,
      createdAt: new Date(),
      lastAccessed: new Date(),
      accessCount: 0,
    });

    logger.debug("Service registered", {
      name,
      lifecycle: definition.lifecycle,
      dependencies: definition.dependencies,
      tags: definition.tags,
    });

    return this;
  }

  public async resolve<T>(name: string, scope?: string): Promise<T> {
    const definition = this.services.get(name);
    if (!definition) {
      throw new Error(`Service '${name}' not found`);
    }

    // Update access metadata
    const metadata = this.metadata.get(name)!;
    metadata.lastAccessed = new Date();
    metadata.accessCount++;

    // Handle different lifecycles
    switch (definition.lifecycle) {
      case "singleton":
        return this.resolveSingleton<T>(name, definition);

      case "scoped":
        if (!scope) {
          throw new Error(`Scope required for scoped service '${name}'`);
        }
        return this.resolveScoped<T>(name, definition, scope);

      case "transient":
        return this.createInstance<T>(name, definition, scope);

      default:
        throw new Error(
          `Unknown lifecycle '${definition.lifecycle}' for service '${name}'`,
        );
    }
  }

  public async resolveAll<T>(tag: string, scope?: string): Promise<T[]> {
    const services: T[] = [];

    for (const [name, definition] of this.services) {
      if (definition.tags.includes(tag)) {
        services.push(await this.resolve<T>(name, scope));
      }
    }

    return services;
  }

  public exists(name: string): boolean {
    return this.services.has(name);
  }

  public createScope(scopeId: string): ServiceScope {
    if (!this.scopes.has(scopeId)) {
      this.scopes.set(scopeId, new Map());
    }

    return new ServiceScope(this, scopeId);
  }

  public async disposeScope(scopeId: string): Promise<void> {
    const scopeInstances = this.scopes.get(scopeId);
    if (!scopeInstances) return;

    // Dispose all scoped instances
    for (const [serviceName, instance] of scopeInstances) {
      if (instance && typeof instance.dispose === "function") {
        try {
          await instance.dispose();
        } catch (error) {
          logger.warn("Error disposing scoped service", {
            service: serviceName,
            scope: scopeId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    this.scopes.delete(scopeId);

    logger.debug("Service scope disposed", { scopeId });
  }

  public getServiceInfo(): Array<
    ServiceMetadata & { definition: Omit<ServiceDefinition, "factory"> }
  > {
    const info: Array<
      ServiceMetadata & { definition: Omit<ServiceDefinition, "factory"> }
    > = [];

    for (const [name, definition] of this.services) {
      const metadata = this.metadata.get(name)!;
      info.push({
        ...metadata,
        definition: {
          singleton: definition.singleton,
          dependencies: definition.dependencies,
          lifecycle: definition.lifecycle,
          tags: definition.tags,
        },
      });
    }

    return info;
  }

  public async dispose(): Promise<void> {
    logger.info("Disposing service container");

    // Dispose all scoped instances
    for (const scopeId of this.scopes.keys()) {
      await this.disposeScope(scopeId);
    }

    // Dispose singleton instances
    for (const [name, instance] of this.instances) {
      if (instance && typeof instance.dispose === "function") {
        try {
          await instance.dispose();
        } catch (error) {
          logger.warn("Error disposing singleton service", {
            service: name,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    this.instances.clear();
    this.services.clear();
    this.metadata.clear();
    this.scopes.clear();
  }

  private async resolveSingleton<T>(
    name: string,
    definition: ServiceDefinition,
  ): Promise<T> {
    let instance = this.instances.get(name);

    if (!instance) {
      instance = await this.createInstance<T>(name, definition);
      this.instances.set(name, instance);

      // Update metadata
      const metadata = this.metadata.get(name)!;
      metadata.instance = instance;
    }

    return instance as T;
  }

  private async resolveScoped<T>(
    name: string,
    definition: ServiceDefinition,
    scope: string,
  ): Promise<T> {
    let scopeInstances = this.scopes.get(scope);
    if (!scopeInstances) {
      scopeInstances = new Map();
      this.scopes.set(scope, scopeInstances);
    }

    let instance = scopeInstances.get(name);
    if (!instance) {
      instance = await this.createInstance<T>(name, definition, scope);
      scopeInstances.set(name, instance);
    }

    return instance as T;
  }

  private async createInstance<T>(
    name: string,
    definition: ServiceDefinition,
    scope?: string,
  ): Promise<T> {
    try {
      // Resolve dependencies first
      const dependencies: any[] = [];
      for (const depName of definition.dependencies) {
        dependencies.push(await this.resolve(depName, scope));
      }

      // Create instance
      const instance = await definition.factory();

      logger.debug("Service instance created", {
        service: name,
        scope,
        dependencyCount: dependencies.length,
      });

      return instance as T;
    } catch (error) {
      logger.error("Failed to create service instance", {
        service: name,
        scope,
        dependencies: definition.dependencies,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private setupBuiltinServices(): void {
    // Register built-in services
    this.register("logger", () => logger, { singleton: true, tags: ["core"] });
  }
}

export class ServiceScope {
  constructor(
    private container: ServiceContainer,
    private scopeId: string,
  ) {}

  public async resolve<T>(name: string): Promise<T> {
    return this.container.resolve<T>(name, this.scopeId);
  }

  public async resolveAll<T>(tag: string): Promise<T[]> {
    return this.container.resolveAll<T>(tag, this.scopeId);
  }

  public async dispose(): Promise<void> {
    return this.container.disposeScope(this.scopeId);
  }

  public getId(): string {
    return this.scopeId;
  }
}

// Export singleton instance
export const serviceContainer = ServiceContainer.getInstance();

// Decorator for automatic service registration
export function Injectable(
  options: {
    name?: string;
    singleton?: boolean;
    dependencies?: string[];
    lifecycle?: "transient" | "singleton" | "scoped";
    tags?: string[];
  } = {},
) {
  return function <T extends new (...args: any[]) => any>(target: T) {
    const serviceName = options.name || target.name;

    serviceContainer.register(serviceName, () => new target(), options);

    return target;
  };
}

// Utility function for dependency injection
export function inject(serviceName: string) {
  return function (target: any, propertyKey: string) {
    // This would be implemented with metadata reflection
    // For now, it's a placeholder for future enhancement
  };
}
